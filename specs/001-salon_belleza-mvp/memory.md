# Bitácora 001 — MVP salón de belleza

Resumen de lo hecho en cada sesión de trabajo sobre esta spec. Se lee junto con `task.md` antes de empezar cualquier tarea.

> **Reglas:** las entradas nuevas se agregan **arriba**, debajo de esta nota, y las anteriores nunca se editan ni se borran.
> Se agrega una entrada al terminar una tarea o un grupo de tareas, y siempre antes de cada commit.
>
> Formato de cada entrada:
> `## AAAA-MM-DD — Título corto (rama: <rama>)` y luego **Hecho**, **Tareas**, **Decisiones**, **Archivos tocados** y **Siguiente paso**.

## 2026-10-09 — Fase 0: base común (rama: fase-0-base)
- **Hecho:** rama `fase-0-base` creada; ningún `.env.*` entra a git. `ValidationPipe` y filtro de errores de BD globales, enum `Role`, helpers de hora de Bogotá, `DataSource` del CLI y scripts de migración, migración *baseline*. El esquema real de `users` y `customers` (solo lectura) coincide con las entidades, y `migration:generate --dryrun` confirma que no hay diferencias. La *baseline* se ejecutó en la BD de desarrollo con autorización de Natalia: creó la tabla `migrations` y la registró, sin cambiar las tablas ni los datos (siguen 2 usuarios y 13 clientes). La app arranca leyendo `.env.development` y responde 400 a un DTO con campos extra o inválidos y a un UUID inválido. `pnpm test` (45/45), `pnpm lint` y `pnpm build` en verde.
- **Tareas:** T003–T009, T010a (nueva) y T014 (adelantada desde la Fase 1). T010 queda **parcial**: falta probar `migration:run` sobre una BD vacía (no se autorizó crear una BD temporal).
- **Decisiones:**
  - `ValidationPipe` y `DbExceptionFilter` se registran con `APP_PIPE`/`APP_FILTER` en `AppModule`, no en `main.ts`, para que los e2e (que no pasan por `main.ts`) se comporten igual.
  - El filtro extrae el campo duplicado de `detail` sin depender del idioma de PostgreSQL ("Key (x)=" o "La llave (x)="). Otros errores de BD → 500 genérico, con el detalle solo en el log. Efecto colateral: un documento de cliente duplicado ahora responde 400 en lugar de 500.
  - La *baseline* usa `CREATE TABLE IF NOT EXISTS` con los mismos nombres de PK y UNIQUE que ya generó TypeORM, para correr tanto en BD vacías como en las que ya tienen las tablas (desarrollo y Railway).
  - `src/config/env.ts` concentra la elección del `.env` y `REQUIRED_ENV`; la usan `AppModule` y `data-source.ts` (que carga el archivo con `process.loadEnvFile` de Node 24, sin `dotenv`).
  - Helpers de Bogotá: fines exclusivos (`[inicio, fin)`), semana de lunes a domingo, ISO sin milisegundos.
  - Con el visto bueno de Natalia: T014 se adelantó (la fase exige tests en verde) y `eslint.config.mjs` se pasó a flat config con las mismas reglas. Además se corrigieron 3 avisos del código previo: `@ts-ignore` de bcryptjs, `try/catch` inútil en `CustomersService.create` y un import sin usar.
  - Los mensajes de class-validator siguen en inglés; pasarlos a español queda en T017.
- **Archivos tocados:** `src/app.module.ts`, `src/config/env.ts`, `src/common/{enums/role.enum.ts, filters/db-exception.filter(.spec).ts, time/bogota(.spec).ts}`, `src/database/{data-source.ts, migrations/1791500000000-Baseline.ts}`, `src/users/{users.service.ts, users.service.spec.ts, users.controller.spec.ts}`, `src/customers/{customers.service.ts, entities/customer.entity.ts}`, `test/app.e2e-spec.ts` (formato), `eslint.config.mjs`, `.prettierrc`, `package.json`, `CLAUDE.md`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T011, el cierre git: commit, visto bueno, push y PR. Pendiente de autorización: probar la *baseline* en una BD vacía (cierra T010). En Railway, correr `migration:run` cuando se despliegue, también con autorización.

## 2026-10-06 — Planeación de tareas y reglas de trabajo (rama: main)
- **Hecho:** se creó `task.md` a partir de `spec.md` y `plan.md`. Se agregó la Fase 1 (revisión del código existente) y se renumeraron las fases (0 a 9, tareas T001–T093). Se verificó la conexión a la BD de desarrollo (PostgreSQL 17.9, BD `salon_belleza`, usuario `postgres`): la nota anterior que decía que se rechazaba la contraseña era vieja. Se creó esta bitácora, su regla en `CLAUDE.md` y un hook `SessionStart` que inyecta un resumen al abrir cada sesión.
- **Tareas:** ninguna de implementación todavía. Siguen hechas solo T001 y T002, de antes.
- **Decisiones:**
  - El módulo `users` se mantiene y Auth lo reutiliza. La tabla `users` no se recrea: solo se le agregan columnas.
  - Cada fase va en su propia rama (`fase-N-nombre`) → tests → commit → visto bueno de Natalia → push → PR a `main` → merge de Natalia. Nunca hay push directo a `main`.
  - BD: lectura libre solo en desarrollo. Toda escritura (tareas `[BD]`) se hace con autorización previa. QA y producción no se tocan.
  - `gh` no está instalado: los PR se abren desde el enlace que muestra el push.
  - La BD se consulta desde el código con el driver `pg` (librería de Node), y Natalia la ve en DBeaver. Es la misma BD.
- **Archivos tocados:** `specs/001-salon_belleza-mvp/{task.md, plan.md, memory.md}`, `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/session-context.js`, `.gitignore`.
- **Siguiente paso:** T003, crear la rama `fase-0-base` y versionar los archivos que aún no están en git, entre ellos los de esta sesión.
