# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Backend (API REST) de un sistema de citas en línea para un salón de belleza (proyecto SENA, Natalia Villa).
Los requisitos están en `docs/` (PDF). Nota: los documentos mencionan Python y Power Automate, pero la
implementación real es **NestJS 11 + TypeORM + PostgreSQL**; usa los docs para el dominio, no para el stack.

## Flujo de trabajo con la spec (obligatorio)

- **Spec activa:** `specs/001-salon_belleza-mvp/` (`spec.md` = qué, `plan.md` = cómo, `task.md` = tareas, `memory.md` = bitácora).
- **Antes de empezar cualquier tarea:** leer `task.md` y `memory.md` de la spec activa. Al abrir cada sesión, el hook
  `SessionStart` (`.claude/hooks/session-context.js`) inyecta las últimas entradas de la bitácora y las próximas tareas
  pendientes, pero ante cualquier duda hay que leer los archivos completos.
- **No sobrescribir:** antes de crear un archivo, comprobar si ya existe. Si existe, leerlo y editarlo; nunca reemplazarlo a ciegas.
- **Al terminar una tarea o grupo de tareas, y siempre antes de cada commit:** marcar `[x]` en `task.md` y agregar una
  entrada nueva **arriba** en `memory.md` (Hecho, Tareas, Decisiones, Archivos tocados, Siguiente paso).
  Las entradas anteriores nunca se editan ni se borran. `memory.md` va en el commit de la fase.
- **Git:** una rama por fase (`fase-N-nombre`) → tests, lint y build en verde → commit → **visto bueno de Natalia** →
  push → PR hacia `main`. Nunca hay push directo a `main` ni push sin visto bueno. Detalle en `task.md` → *Flujo de trabajo*.
- **Base de datos:** lectura libre solo en desarrollo. Toda escritura (migraciones, seed, DML/DDL, e2e o k6 que escriben;
  tareas `[BD]`) requiere autorización previa. QA y producción no se tocan nunca.

## Comandos (pnpm)

- `pnpm install`
- `pnpm start:dev` — servidor en watch (puerto `PORT` o 3000)
- `pnpm build` / `pnpm start:prod` (`node dist/main`, lo que ejecuta Railway vía `railway.yml`)
- `pnpm lint` (eslint --fix) · `pnpm format` (prettier: comillas simples, printWidth 90)
- `pnpm test` — unit tests (`src/**/*.spec.ts`)
- Un solo archivo: `pnpm test -- src/customers/customers.service.spec.ts`
- Un solo caso: `pnpm test -- -t "debería crear"`
- `pnpm test:e2e` — levanta `AppModule` completo, requiere PostgreSQL real
- Prueba de carga (k6, no está en package.json): `k6 run volume-tests/customers.load.js` contra `localhost:3000`
- Migraciones (escriben en la BD → pedir autorización): `pnpm migration:run` · `pnpm migration:revert` ·
  `pnpm migration:generate src/database/migrations/<Nombre>` (generar no escribe en la BD; con `--dryrun` solo muestra el SQL)

## Arquitectura

- `src/app.module.ts`: `TypeOrmModule.forRootAsync` con `autoLoadEntities: true` y `synchronize: false`
  → el esquema se maneja solo con migraciones (`src/database/migrations/`, CLI con `src/database/data-source.ts`,
  que usa el mismo `.env` que la app). La primera es la *baseline* de `users` y `customers` (`IF NOT EXISTS`).
- Globales en `app.module.ts` (`APP_PIPE`/`APP_FILTER`, para que los e2e también los tengan): `ValidationPipe`
  (`whitelist`, `forbidNonWhitelisted`, `transform`) y `DbExceptionFilter` (`23505` → 400 con `field`, `23P01` → 409).
- `src/common/`: enum `Role`, filtro de BD y helpers de hora de Bogotá (`time/bogota.ts`, UTC-5 fijo, fines exclusivos).
- Un módulo por recurso (`users`, `customers`) con el mismo patrón: `entities/`, `dto/` (Update = `PartialType(Create)`),
  service con `@InjectRepository`, controller con rutas `POST /create`, `GET /all`, `GET|PATCH|DELETE /:id`.
- Borrado lógico: `remove()` pone el flag activo en `false`; `findAll()` filtra solo activos.
- Errores y mensajes al usuario en español (`NotFoundException`, `BadRequestException`).
- `users`: contraseña hasheada con bcryptjs en create/update; `@Exclude()` + `ClassSerializerInterceptor` la ocultan;
  `ParseUUIDPipe` en los `:id`; error PG `23505` → email duplicado.
- `customers`: datos del cliente (document único, name, lastName, email, phone).

## Particularidades a tener en cuenta

- Todo DTO necesita decoradores de class-validator en cada propiedad: `forbidNonWhitelisted` rechaza (400) cualquier
  propiedad sin decorar.
- `Customer` usa la propiedad `isActivate` (columna `is_active`); `User` usa `isActive`. Respetar cada nombre.
- El DTO de creación de clientes vive en `customers/dto/create-user-dto.ts` (nombre heredado).
- Configuración por ambiente: `.env.development` (por defecto), `.env.qa` y `.env.production`, elegidos con `NODE_ENV` (los tests de Jest usan desarrollo). Las variables del sistema tienen prioridad (Railway las define en su panel). Solo `.env.example` se versiona; si agregas una variable, agrégala también ahí y en `REQUIRED_ENV` de `src/config/env.ts` si es obligatoria. En PowerShell, para otro ambiente: `$env:NODE_ENV='qa'; pnpm start:dev`.
- Patrón de los specs: mock del repositorio con `getRepositoryToken(Entity)` (ver `users.*.spec.ts` y `customers.*.spec.ts`).
- ESLint 9 con flat config (`eslint.config.mjs`); Prettier con `endOfLine: auto` porque en Windows los archivos están en CRLF.

## Dominio (de docs/)

Actores: Cliente, Estilista/Manicurista, Administrador (estilista principal); a futuro Proveedor (venta de productos, proceso alterno).

Requisitos priorizados (SB V1):

- Alta: 01 agenda/calendario de empleados · 02 catálogo de servicios · 06 roles (cada tipo de usuario ve sus funciones)
- Media: 03 elegir estilista · 04 datos del cliente (nombre, teléfono) · 10 recordar datos del cliente · 11 responsive
- Baja: 05 recordatorio ≥1 día antes (SMS) · 07 sesión expira a 15 min · 09 escalabilidad (servicios/sedes) · 12 imágenes livianas

Casos de uso: reservar cita (servicio → estilista → fecha/hora → confirmar), gestionar disponibilidad de estilistas/servicios,
notificaciones (confirmar/cancelar libera el horario), calendario interno (filtrar por fecha/estilista/servicio; no se
modifican citas pasadas), administrar servicios y precios (nombre, descripción, duración, precio; advertir al eliminar uno
con citas activas). Estados de cita: activa, cancelada, cerrada (servicio realizado). Histórico para análisis del administrador.

Aún no implementado: servicios, estilistas, agenda, citas, autenticación/roles, notificaciones.
