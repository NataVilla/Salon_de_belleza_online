# Hallazgos de la revisión (T012, Fase 1)

Revisión del 2026-10-13 de `src/users/`, `src/customers/`, `src/app.module.ts`, `src/main.ts` y `src/app.controller.ts`.
Este texto se copia en la descripción del PR de la Fase 1. La columna **Tarea** indica dónde se resuelve cada hallazgo.

**Estado al cierre de la fase (2026-10-13):** todos los hallazgos quedaron resueltos en esta fase, salvo el #19 (CORS),
que pasa a la Fase 2 (T022a). Durante el trabajo apareció uno más (#23).

## Cambios de comportamiento de la API

Esta fase debía optimizar sin cambiar el comportamiento. Estas excepciones son correcciones de errores o decisiones de Natalia:

- Un id que no es UUID → **400** "El id debe ser un UUID válido." (antes: 500 en `customers`, mensaje en inglés en `users`).
- Textos de más de 255 caracteres → **400** (antes: 500).
- Un usuario o cliente borrado (inactivo) → **404** en `GET`, `PATCH` y `DELETE /:id`, para todos (antes se veía y se podía editar).
- 404 sin el UUID: "Cliente no encontrado." / "Usuario no encontrado.".
- Validaciones nuevas: contraseña de 8 a 72 caracteres, celular de 10 dígitos, documento solo con números (máximo 20), sin textos
  de solo espacios. Todos los mensajes en español.
- El email se guarda sin espacios y en minúsculas (usuarios y clientes).
- Email duplicado → "Ya existe un registro con ese email." (con `field`), igual al crear y al actualizar.
- `GET /` ("Hello World!") se reemplazó por `GET /health` (200, o 503 si la BD no responde).

## Bugs y comportamiento incorrecto

| # | Hallazgo | Dónde | Tarea |
|---|---|---|---|
| 1 | Un UUID inválido en `/customers/:id` llega a PostgreSQL (error `22P02`) y responde **500** en lugar de 400 (comprobado con la app levantada el 2026-10-13) | `customers.controller.ts` | T016 |
| 2 | Un texto de más de 255 caracteres (`varchar(255)`) llega a PostgreSQL (error `22001`) y responde **500**: los DTO no tienen `@MaxLength` | DTO de `users` y `customers` | T017 |
| 3 | `findOne`, `update` y `remove` no filtran por activo: un usuario o cliente borrado (lógicamente) sigue saliendo en `GET /:id` y se puede editar, aunque `GET /all` lo oculte | `users.service.ts`, `customers.service.ts` | T018a (decisión: 404 para todos) |
| 4 | El email del usuario no se normaliza: `Ana@x.com` y `ana@x.com` se registran como dos usuarios distintos. Con el login (Fase 2) esto rompe `findByEmail` | `users` (DTO/service) | T018b |
| 5 | Los mensajes de `customers` dicen "Usuario con ID … no encontrado" en lugar de "Cliente" | `customers.service.ts` | T018 |
| 6 | Email duplicado: `create` responde "El email ya está registrado." con su propio `try/catch`, pero `update` responde el mensaje del filtro global. El mismo error da dos mensajes distintos | `users.service.ts` | T018 |

## Validaciones de los DTO

| # | Hallazgo | Tarea |
|---|---|---|
| 7 | `@IsNotEmpty` acepta textos con solo espacios (`"   "`): faltan `trim` y una validación de contenido | T017 |
| 8 | La contraseña no tiene longitud mínima (el `@MinLength(6)` está comentado) ni máxima. bcrypt solo usa los primeros 72 bytes, así que conviene `@MaxLength(72)` | T017 |
| 9 | `phone` y `document` no validan formato (solo `@IsString`) | T017 |
| 10 | Los mensajes de class-validator siguen en inglés | T017 |
| 11 | El DTO de clientes usa `!` en las propiedades y el de usuarios no: hay que unificar el estilo | T017 |

## Duplicación y limpieza

| # | Hallazgo | Tarea |
|---|---|---|
| 12 | La búsqueda "buscar o lanzar `NotFoundException`" se repite en `findOne` y `update` de los dos servicios | T018 |
| 13 | `saltRounds = 10` está repetido (en `create` y en `update`). Debería ser una constante | T018 |
| 14 | Comentarios de tutorial en `users.service.ts` (`// <-- 1. Importamos bcrypt`, pasos 2–5) y `return await` innecesarios | T018 |
| 15 | `update` de usuarios modifica el DTO recibido (`updateUserDto.password = …`) en lugar de construir un objeto nuevo | T018 |
| 16 | Nombre de archivo heredado `create-user-dto.ts` en `customers` | T015 |
| 17 | `@types/bcryptjs` sobra (bcryptjs 3 trae sus tipos) y `bcrypt` está en `allowBuilds` sin usarse | T013 |
| 18 | `@nestjs/mapped-types` tiene versión `"*"` en `package.json`: cualquier instalación puede traer una versión mayor con cambios incompatibles | T013b |

## Configuración (`main.ts`, `app.module.ts`, `app.controller.ts`)

| # | Hallazgo | Tarea |
|---|---|---|
| 19 | CORS con `origin: true` y `credentials: true`: cualquier sitio puede hacer peticiones con credenciales. Hoy no hay sesión, pero con Auth (Fase 2) hay que limitar los orígenes con una variable (`CORS_ORIGIN`) | T022a (Fase 2) |
| 20 | `main.ts` lee `process.env.PORT` directamente en lugar de usar `ConfigService` (funciona igual, pero rompe la regla de un solo lugar para la configuración) | T018c |
| 21 | `GET /` responde "Hello World!". Podría ser un `GET /health` con el estado de la conexión a la BD, útil para Railway | T018d (opcional) |
| 22 | `app.module.ts` está bien: `synchronize: false`, `getOrThrow` y pipe y filtro globales. Sin hallazgos | — |
| 23 | (encontrado en T020) El mensaje de `forbidNonWhitelisted` salía en inglés ("property id should not exist") | `validationExceptionFactory` en el `ValidationPipe` global: "El campo id no está permitido." |

## Dependencias (T013–T013c)

- `pnpm audit --prod`: de 1 crítica, 7 altas, 5 moderadas y 1 baja → **0**. Con dev, solo `sprintf-js` (moderada, sin versión corregida
  publicada), ignorada y documentada en `pnpm-workspace.yaml`.
- Actualizado dentro de los rangos actuales (NestJS 11.2.7, TypeORM 0.3.31, jest 30.5…), sin versiones mayores.
- `allowBuilds` decidido (`@parcel/watcher` y `unrs-resolver` en `false`), `packageManager: pnpm@11.13.0`, sin `@types/bcryptjs`.
- `pnpm audit --prod --audit-level high` pasa a ser obligatorio en el cierre de cada fase.

## Observaciones que no se cambian en esta fase

Cambiarlas alteraría la API o el esquema, y esta fase no debe cambiar el comportamiento.

- Las rutas `POST /create` y `GET /all` no siguen REST (`POST /` y `GET /`). Se mantienen porque el frontend puede depender de ellas.
- `DELETE /:id` responde 200 con el cuerpo vacío. Lo usual sería 204.
- `customers` no tiene `created_at`/`updated_at` como `users`, y su columna `lastName` está en camelCase mientras las demás usan snake_case (`is_active`). Se revisa en la Fase 3 (clientes) con su migración.
- Todos los endpoints son públicos, incluido `GET /users/all`. Se resuelve en la Fase 2 (Auth y roles).
- `PATCH /users/:id` permite cambiar email y contraseña sin pedir la contraseña actual. Se resuelve en la Fase 2.
