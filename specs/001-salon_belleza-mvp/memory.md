# Bitácora 001 — MVP salón de belleza

Resumen de lo hecho en cada sesión de trabajo sobre esta spec. Se lee junto con `task.md` antes de empezar cualquier tarea.

> **Reglas:** las entradas nuevas se agregan **arriba**, debajo de esta nota, y las anteriores nunca se editan ni se borran.
> Se agrega una entrada al terminar una tarea o un grupo de tareas, y siempre antes de cada commit.
>
> Formato de cada entrada:
> `## AAAA-MM-DD — Título corto (rama: <rama>)` y luego **Hecho**, **Tareas**, **Decisiones**, **Archivos tocados** y **Siguiente paso**.

## 2026-10-13 — Mensaje de propiedad no permitida en español y commit de la Fase 1 (rama: fase-1-revision)
- **Hecho:**
  - Nuevo `validationExceptionFactory` (`src/common/pipes/validation-exception.factory.ts`, + spec) en el `ValidationPipe` global. Responde igual que Nest por defecto, pero traduce `forbidNonWhitelisted`: "El campo id no está permitido." (soporta objetos anidados: `address.zip`).
  - `hallazgos-fase-1.md` quedó como texto del PR: estado final, cambios de comportamiento de la API, el hallazgo #23 y el resumen de dependencias.
  - `CLAUDE.md` se actualizó (`exceptionFactory`, `GET /health`).
  - Verificación del cierre: `pnpm test` 89/89, `pnpm test:e2e` 11/11 (sin escribir en la BD), `lint`, `build` y `pnpm audit --prod --audit-level high` (0 vulnerabilidades) en verde. Commit de la fase en `fase-1-revision`.
- **Tareas:** corrección del hallazgo #23 (pedido por Natalia) y T021 en curso: el commit está hecho; faltan el visto bueno, el push y el PR.
- **Decisiones:**
  - Se usa un `exceptionFactory` en lugar de traducir en cada DTO, porque ese mensaje lo genera class-validator y no se puede definir con `{ message }`.
  - T013d (alertas de Dependabot) sigue pendiente y la hace Natalia en GitHub. No bloquea el cierre.
  - T010 de la Fase 0: la BD temporal `salon_belleza_t010` sigue existiendo; la borra Natalia cuando termine de revisarla.
- **Archivos tocados:** `src/common/pipes/validation-exception.factory(.spec).ts` (nuevos), `src/app.module.ts`, `test/validation.e2e-spec.ts`, `CLAUDE.md`, `specs/001-salon_belleza-mvp/{hallazgos-fase-1.md, task.md, memory.md}`.
- **Siguiente paso:** visto bueno de Natalia → `git push -u origin fase-1-revision` → PR a `main` con el texto de `hallazgos-fase-1.md` → merge de Natalia → marcar T021.

## 2026-10-13 — T020: tests de los cambios de la fase (rama: fase-1-revision)
- **Hecho:** se revisó la cobertura de T020. `findByEmail`, el email normalizado, inactivo → 404 y duplicado → 400 ya tenían tests de sus tareas. Faltaba el nivel HTTP:
  - `uuid.pipe.spec.ts`: UUID válido pasa; inválido → 400 en español.
  - `test/validation.e2e-spec.ts`: UUID inválido → 400 en las 6 rutas `:id`; `POST /customers/create` con un mensaje por campo; contraseña corta → 400; propiedad extra (`id`) → 400; `PATCH` parcial con celular inválido → 400.

  `pnpm test` 86/86, `pnpm test:e2e` 11/11, `lint` y `build` en verde. Conteo (lectura) después del e2e: 2 usuarios y 13 clientes, sin cambios.
- **Tareas:** T020.
- **Decisiones:**
  - El e2e de validación solo envía peticiones inválidas, que se rechazan antes de la BD. No necesita autorización de escritura. Los casos que sí tocan datos (inactivo → 404, duplicado) quedan en los tests unitarios y en las pruebas en vivo de T018a y T018b.
  - Detectado: el mensaje de `forbidNonWhitelisted` sigue en inglés ("property id should not exist"). Se le propone a Natalia traducirlo antes del cierre.
- **Archivos tocados:** `src/common/pipes/uuid.pipe.spec.ts` (nuevo), `test/validation.e2e-spec.ts` (nuevo), `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** decidir lo del mensaje en inglés; luego T021 (cierre git: commit, visto bueno, push y PR).

## 2026-10-13 — T019: `users` listo para Auth (rama: fase-1-revision)
- **Hecho:** `UsersModule` exporta `UsersService` en lugar de `TypeOrmModule`. Nuevo `UsersService.findByEmail(email)`: normaliza el email con `normalizeEmail()`, busca solo activos y devuelve `User | null` con la contraseña hasheada. 2 tests nuevos (email normalizado + filtro de activos + incluye la contraseña; `null` si no existe). `pnpm test` 82/82, `test:e2e` 1/1, `lint` y `build` en verde.
- **Tareas:** T019.
- **Decisiones:**
  - Se exporta el servicio y no el repositorio, para que Auth respete las reglas de `users` (solo activos, hash, email normalizado). Nada importaba el repositorio exportado.
  - `findByEmail` devuelve `null` en lugar de lanzar 404, porque el login de la Fase 2 debe responder 401 genérico ("usuario o contraseña incorrectos") sin revelar si el email existe.
  - Un usuario inactivo (borrado) no se encuentra, así que no puede iniciar sesión, igual que con el 404 de T018a. El bloqueo por intentos (`is_locked`, Fase 2) es otra cosa: esa cuenta sí se encuentra, para responder 403.
  - `CustomersModule` sigue exportando `TypeOrmModule`. Se revisará en la Fase 2, cuando el registro cree `user` + `customer` en una transacción.
- **Archivos tocados:** `src/users/{users.module.ts, users.service.ts, users.service.spec.ts}`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T020 (revisar qué tests faltan de los cambios de la fase) y luego T021 (cierre git).

## 2026-10-13 — T018d: `GET /health` (rama: fase-1-revision)
- **Hecho:** `GET /` ("Hello World!") se reemplazó por `GET /health`. `AppService.health()` hace `SELECT 1` con el `DataSource` de TypeORM y responde 200 `{ status: 'ok', database: 'up' }`, o 503 `{ status: 'error', database: 'down' }` sin exponer el error. Se actualizaron `app.controller.spec.ts` (los casos ok y 503, con `DataSource` simulado) y `test/app.e2e-spec.ts` (`/health` → 200, y ahora cierra la app en `afterEach`). `pnpm test` 80/80, `pnpm test:e2e` 1/1 (solo hace `SELECT 1`), `lint` y `build` en verde. App compilada: `/health` → 200 y `/` → 404.
- **Tareas:** T018d. Corrige el hallazgo #21. Además se volvieron a marcar T018b y T018c.
- **Decisiones:**
  - Sin `@nestjs/terminus`: para una sola comprobación no vale la pena una dependencia nueva.
  - `GET /` deja de existir (404). Nada en el repo dependía de él aparte de los dos tests.
  - `railway.yml` no define un healthcheck. Para que Railway use `/health`, hay que configurarlo en su panel (Settings → Healthcheck Path). No se verificó si Railway lee `railway.yml`: su configuración como código usa `railway.json`/`railway.toml`.
  - `task.md` se guardó desde fuera (a las 3:14 p. m., probablemente un editor con una versión anterior abierta y formato de Prettier al guardar). Se perdieron las marcas `[x]` de T018b y T018c y se restauraron. Lo demás estaba intacto y se mantuvo el formato nuevo.
- **Archivos tocados:** `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`, `test/app.e2e-spec.ts`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T019 (preparar `users` para Auth: exportar `UsersService` y `findByEmail`).

## 2026-10-13 — T018c: `PORT` con `ConfigService` (rama: fase-1-revision)
- **Hecho:** `main.ts` lee el puerto con `app.get(ConfigService).get('PORT')` (por defecto 3000) en lugar de `process.env.PORT`. Probado con la app compilada: sin `PORT` en el sistema usa el de `.env.development` (3000 → 200), y con `PORT=3456` en el sistema escucha en 3456 (→ 200), que es lo que hará Railway. `pnpm test` 79/79, `lint` y `build` en verde.
- **Tareas:** T018c. Corrige el hallazgo #20.
- **Decisiones:** `PORT` sigue siendo opcional (no va en `REQUIRED_ENV`) porque Railway la inyecta. Ya estaba en `.env.example`.
- **Archivos tocados:** `src/main.ts`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T018d (opcional, `GET /health`) o T019.

## 2026-10-13 — T018b: email normalizado (rama: fase-1-revision)
- **Hecho:** nuevo `@NormalizeEmail()` (trim + minúsculas) en `src/common/decorators/normalize-email.decorator.ts`, junto con la función `normalizeEmail()` para usarla fuera de los DTO (T019, `findByEmail`). Se aplica al `email` de `CreateUserDto` y de `CreateCustomerDto` (y a sus Update, por `PartialType`). Tests nuevos: normaliza al crear y al actualizar. `pnpm test` 79/79, `lint` y `build` en verde. Revisión de la BD (lectura): los 2 usuarios y los 13 clientes ya tienen el email normalizado y sin duplicados por mayúsculas, así que no hubo que corregir datos. Prueba en vivo: `POST /users/create` con el email de un usuario existente en MAYÚSCULAS y con espacios → 400 "Ya existe un registro con ese email." con `field: email`, y siguen 2 usuarios (no se escribió nada). Esto confirma además en vivo el filtro de duplicados de T018.
- **Tareas:** T018b. Corrige el hallazgo #4.
- **Decisiones:**
  - La normalización se hace en el DTO, igual que `@Trim`, para que la aplique el `ValidationPipe` global. El `RegisterDto` de la Fase 2 debe usar el mismo decorador.
  - También se normaliza el email de `customers`, aunque ahí no es único, porque el registro (Fase 2) guarda el mismo email en las dos tablas.
  - Natalia indicó que la única BD que existe es la de desarrollo, con datos de prueba, y autorizó leer y escribir en ella para T018b avisando antes. Al final no hizo falta escribir. La prueba en vivo se anunció antes de ejecutarla.
  - No se agregó un índice único sobre `lower(email)` en la BD: cambiaría el esquema (migración) y la normalización en la app ya lo cubre. Se puede reconsiderar en la Fase 2.
- **Archivos tocados:** `src/common/decorators/normalize-email.decorator.ts` (nuevo), `src/users/dto/{create-user.dto.ts, user.dto.spec.ts}`, `src/customers/dto/{create-customer.dto.ts, customer.dto.spec.ts}`, `CLAUDE.md`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T018c (`PORT` con `ConfigService`).

## 2026-10-13 — T018a: un registro borrado responde 404 (rama: fase-1-revision)
- **Hecho:** `findOne` de `users` y `customers` busca con `{ id, isActive/isActivate: true }`. `update` dejó de usar `preload`, que no filtraba por activo, y ahora hace `findOne` + `repository.merge` + `save`: sigue siendo una lectura y una escritura. `remove` ya usaba `findOne`, así que borrar dos veces el mismo registro → 404. Tests nuevos: `findOne` filtra por activo; `update` y `remove` sobre un inactivo → 404 sin llamar a `save`. `pnpm test` 76/76, `lint` y `build` en verde. Con la app levantada (solo `GET`): cliente y usuario inactivos → 404 ("Cliente/Usuario no encontrado."); activos → 200.
- **Tareas:** T018a. Corrige el hallazgo #3.
- **Decisiones:** la prueba en vivo se hizo solo con `GET`. `PATCH` y `DELETE` sobre inactivos los cubren los tests unitarios, para no arriesgar una escritura en la BD si algo fallaba. Si a futuro hace falta reactivar registros, se diseña aparte (decisión de Natalia: 404 para todos, incluido el admin).
- **Archivos tocados:** `src/users/{users.service.ts, users.service.spec.ts}`, `src/customers/{customers.service.ts, customers.service.spec.ts}`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T018b (normalizar el email de usuarios).

## 2026-10-13 — Ajuste a T018: el 404 no muestra el UUID (rama: fase-1-revision)
- **Hecho:** los 404 ahora dicen "Cliente no encontrado." y "Usuario no encontrado.", sin el id. `notFound()` ya no recibe parámetros. Los tests de los dos services verifican el mensaje exacto. `pnpm test` 72/72, `lint` y `build` en verde. Con la app levantada (solo lectura), un UUID inexistente → 404 con los mensajes nuevos.
- **Tareas:** ajuste a T018 (anotado debajo de la tarea en `task.md`).
- **Decisiones:**
  - Natalia señaló que el UUID es un dato que el usuario no ve, así que no debe aparecer en los mensajes. Poner la cédula en su lugar no es posible: las rutas `/:id` reciben el UUID, y si el registro no existe no hay de dónde sacarla (además, `users` todavía no tiene documento).
  - El UUID ya lo genera el sistema (`@PrimaryGeneratedColumn('uuid')` + `DEFAULT uuid_generate_v4()`). Nadie puede enviarlo, porque los DTO no tienen `id` y `forbidNonWhitelisted` lo rechaza.
  - No se agrega búsqueda por cédula (`GET /customers/document/:document`): por ahora no hace falta (decisión de Natalia).
- **Archivos tocados:** `src/users/{users.service.ts, users.service.spec.ts}`, `src/customers/{customers.service.ts, customers.service.spec.ts}`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T018a (inactivo → 404).

## 2026-10-13 — T018: manejo de errores unificado (rama: fase-1-revision)
- **Hecho:**
  - `UsersService.create` ya no tiene `try/catch`: el email duplicado (`23505`) lo traduce el `DbExceptionFilter` global, igual al crear y al actualizar ("Ya existe un registro con ese email.", con `field`).
  - Nuevo `UuidPipe` (`src/common/pipes/uuid.pipe.ts`) con el mensaje "El id debe ser un UUID válido.", que usan los controllers de `users` y `customers`.
  - Los dos services quedaron iguales: un `notFound(id)` privado en lugar del mensaje repetido, `SALT_ROUNDS` como constante, sin comentarios de tutorial ni `return await`.
  - `update` de usuarios hashea en una copia y ya no modifica el DTO recibido.
  - `customers` dice "Cliente con ID … no encontrado."
  - Tests: el de "email duplicado" ahora comprueba que el error pasa al filtro (el 400 lo cubre `db-exception.filter.spec.ts`); se agregaron "no modifica el DTO" y el mensaje de "Cliente". `pnpm test` 72/72, `lint` y `build` en verde. Con la app levantada (solo lectura): UUID inválido → 400 en español en los dos módulos; inexistente → 404 "Cliente…" / "Usuario…".
- **Tareas:** T018. Corrige los hallazgos #5, #6, #12, #13, #14 y #15.
- **Decisiones:**
  - El mensaje de email duplicado cambia de "El email ya está registrado." a "Ya existe un registro con ese email." (el del filtro), para que crear y actualizar respondan igual.
  - Los datos de clientes con celular fuera de formato se dejan como están (decisión de Natalia): la Fase 8 (seed) carga datos válidos.
  - `findOne` todavía no filtra por activo: eso es T018a.
  - `CLAUDE.md` se actualizó (`UuidPipe`, `@Trim`, los services no atrapan errores de BD).
- **Archivos tocados:** `src/common/pipes/uuid.pipe.ts` (nuevo), `src/users/{users.service.ts, users.service.spec.ts, users.controller.ts}`, `src/customers/{customers.service.ts, customers.service.spec.ts, customers.controller.ts}`, `CLAUDE.md`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T018a (inactivo → 404).

## 2026-10-13 — T017: validaciones de los DTO (rama: fase-1-revision)
- **Hecho:** nuevo decorador `@Trim()` en `src/common/decorators/trim.decorator.ts`. Reglas nuevas en `CreateUserDto` y `CreateCustomerDto` (los DTO de actualización las heredan con `PartialType`, incluido el `@Trim`):
  - textos: `@Trim` + `@IsNotEmpty` + `@MaxLength(255)`;
  - email: `@IsEmail`;
  - contraseña: de 8 a 72 caracteres, sin trim;
  - celular: `^\d{10}$`;
  - documento: `^\d{1,20}$`.

  Todos los mensajes están en español. Se quitaron los `!` del DTO de clientes, para que tenga el mismo estilo que el de usuarios. Hay 26 tests nuevos (`user.dto.spec.ts`, `customer.dto.spec.ts`): `pnpm test` 71/71, `lint` y `build` en verde. Con la app levantada, cuerpos inválidos → 400 con un mensaje en español por campo (sin escribir en la BD).
- **Tareas:** T017. Corrige los hallazgos #2, #7, #8, #9, #10 y #11.
- **Decisiones:**
  - Natalia definió las reglas: contraseña mínimo 8, celular de 10 dígitos y documento solo con números. El máximo de 20 dígitos del documento y el de 72 caracteres de la contraseña (bcrypt solo usa 72 bytes) son de Claude.
  - El email sigue sin pasarse a minúsculas: eso es T018b.
  - Revisión de la BD de desarrollo (solo lectura, sin imprimir datos personales): 10 de los 13 clientes tienen un celular de 7 a 11 dígitos (solo números). Los documentos y los textos cumplen. Los datos no se tocaron. Un PATCH que no envíe `phone` sigue funcionando, pero si se envía, debe tener 10 dígitos.
- **Archivos tocados:** `src/common/decorators/trim.decorator.ts` (nuevo), `src/users/dto/{create-user.dto.ts, user.dto.spec.ts (nuevo)}`, `src/customers/dto/{create-customer.dto.ts, customer.dto.spec.ts (nuevo)}`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** decidir qué hacer con los 10 celulares que no cumplen; luego T018 (manejo de errores y mensajes).

## 2026-10-13 — T016: `ParseUUIDPipe` en customers (rama: fase-1-revision)
- **Hecho:** `ParseUUIDPipe` en `GET`, `PATCH` y `DELETE /customers/:id`, igual que en `users`. Con la app compilada y levantada (solo lectura): un id que no es UUID → **400** en las tres rutas (antes era 500 por el error `22P02` de PostgreSQL), y un UUID válido que no existe → 404. `pnpm test` (45/45), `lint` y `build` en verde. Corrige el hallazgo #1.
- **Tareas:** T016.
- **Decisiones:** el mensaje del 400 es el de Nest por defecto, en inglés ("Validation failed (uuid is expected)"), igual que en `users`. Pasarlo a español en los dos módulos queda para T017/T018, y el test de "UUID inválido → 400" para T020.
- **Archivos tocados:** `src/customers/customers.controller.ts`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T017 (validaciones de los DTO).

## 2026-10-13 — T015: nombres de los DTO de clientes; T013d redefinida (rama: fase-1-revision)
- **Hecho:** con `git mv` (para conservar el historial), `create-user-dto.ts` pasó a llamarse `create-customer.dto.ts` y `update-customer-dto.ts` pasó a `update-customer.dto.ts`. Se actualizaron los imports en `customers.controller.ts`, `customers.service.ts`, `customers.controller.spec.ts` y `update-customer.dto.ts`, y se quitó de `CLAUDE.md` la nota del nombre heredado. Los nombres de las clases no cambiaron. `pnpm test` (45/45), `lint` y `build` en verde.
- **Tareas:** T015. T013d se redefinió como "activar solo las alertas de Dependabot", y queda pendiente: la hace Natalia en GitHub.
- **Decisiones:** Dependabot solo con alertas, sin `dependabot.yml` ni PRs automáticos, hasta que haya CI que corra los tests en cada PR. Hay que comprobar que lee el lockfile de pnpm 11.
- **Archivos tocados:** `src/customers/{customers.controller.ts, customers.service.ts, customers.controller.spec.ts}`, `src/customers/dto/{create-customer.dto.ts, update-customer.dto.ts}` (renombrados), `CLAUDE.md`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T016 (`ParseUUIDPipe` en customers).

## 2026-10-13 — T013c: auditoría de dependencias en el flujo de cada fase (rama: fase-1-revision)
- **Hecho:** el paso 2 del *Flujo de trabajo* (`task.md`) y la regla de Git de `CLAUDE.md` ahora exigen `pnpm audit --prod --audit-level high` en verde antes del commit de cada fase. `CLAUDE.md` también lo lista en Comandos, junto con dónde están las excepciones (`auditConfig.ignoreGhsas`) y `allowBuilds`. Se comprobó que el comando devuelve código 0 con el estado actual.
- **Tareas:** T013c.
- **Decisiones:** se usa `--audit-level high`, que solo falla con vulnerabilidades críticas o altas. Las moderadas y bajas no bloquean el commit, pero se revisan. Orden para corregir: `pnpm update` → `pnpm audit --fix=update` → `overrides`. Ignorar un aviso solo cuando no hay versión corregida, y con un comentario.
- **Archivos tocados:** `CLAUDE.md`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T013d (Dependabot, opcional) o seguir con T015.

## 2026-10-13 — T013b: actualización de dependencias y vulnerabilidades (rama: fase-1-revision)
- **Hecho:** `@nestjs/mapped-types` pasó de `"*"` a `^2.1.1` (antes de actualizar: con `"*"` habría subido a la 12.0.0, incompatible con Nest 11) y se agregó `"packageManager": "pnpm@11.13.0"`. `pnpm update` dentro de los rangos actuales: NestJS 11.2.7, TypeORM 0.3.31, pg 8.23.1, jest 30.5.2 y otros parches. `pnpm audit --fix=update` corrigió `fast-uri` y `brace-expansion`; los `overrides` corrigieron `js-yaml` 3.x, `browserslist` y `baseline-browser-mapping`. Resultado: `pnpm audit --prod` sin vulnerabilidades (antes: 1 crítica, 7 altas, 5 moderadas, 1 baja). Con dev: solo `sprintf-js`, ignorada. `pnpm test` (45/45), `test:cov`, `lint` y `build` en verde, y la app compilada arranca y responde `GET /`.
- **Tareas:** T013b.
- **Decisiones:**
  - No se suben versiones mayores (NestJS 12, TypeORM 1.x, TypeScript 7, ESLint 10, `@types/node` 26): cambian la API y no entran en una fase de revisión.
  - `sprintf-js` (GHSA-hp3w-g68c-fv3c, moderada) se ignora en `auditConfig.ignoreGhsas`: no hay versión corregida publicada, solo llega a jest para leer la configuración de cobertura y no procesa datos de usuarios. Hay que revisarlo cuando salga la 1.1.4. En pnpm 11.13 la opción se llama `auditConfig.ignoreGhsas`; `audit.ignore` existe desde la 11.16.
  - `@parcel/watcher` (nuevo con jest 30.5, para el modo watch) queda en `allowBuilds: false` porque su binario ya llega por `optionalDependencies`. Sin esa decisión, `strictDepBuilds` haría fallar la instalación, también en Railway.
  - `minimumReleaseAgeExclude` lo agregó `pnpm audit --fix=update`, para poder instalar parches de seguridad de menos de un día; se deja con un comentario.
  - Con la app levantada se confirmó el hallazgo #1: un UUID inválido en `/customers/:id` responde 500 (T016).
- **Archivos tocados:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `specs/001-salon_belleza-mvp/{task.md, hallazgos-fase-1.md, memory.md}`.
- **Siguiente paso:** T013c (`pnpm audit --prod` en el flujo de cada fase) y T013d (Dependabot, opcional).

## 2026-10-13 — T013a: `allowBuilds` y versión de pnpm (rama: fase-1-revision)
- **Hecho:** `unrs-resolver: false` en `allowBuilds`, con un comentario. Solo lo usa jest (vía `jest-resolve`), y su `postinstall` (`napi-postinstall`) solo descarga el binario nativo si falta. Ese binario (`@unrs/resolver-binding-win32-x64-msvc`) ya llega por `optionalDependencies`, y los tests siempre pasaron sin ejecutar el script. `pnpm test` (45/45), `pnpm lint` y `pnpm build` en verde.
- **Tareas:** T013a. Se amplió T013b con `"packageManager": "pnpm@11.13.0"`.
- **Decisiones:**
  - Se queda en pnpm 11. La 12 (ejecutable nativo, cambios en `pnpm add` de gestores de paquetes y en la prioridad de la versión fijada por el proyecto) no trae nada que este proyecto necesite, y la 11 sigue recibiendo actualizaciones. Si se migra, será una tarea aparte.
  - Se fija la versión de pnpm en `package.json` para que Railway use la misma que la máquina local.
  - pnpm 11 ya trae por defecto `minimumReleaseAge: 1440` (no instala versiones de menos de un día) y `strictDepBuilds: true`. No reemplazan a `pnpm audit`.
- **Archivos tocados:** `pnpm-workspace.yaml`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T013b (actualizar dependencias, fijar `@nestjs/mapped-types` y `packageManager`).

## 2026-10-13 — T013: limpieza de bcrypt (rama: fase-1-revision)
- **Hecho:** se quitó `@types/bcryptjs` de `devDependencies` (`pnpm remove`), porque bcryptjs 3.0.3 trae sus propios tipos, y se quitó `bcrypt` de `allowBuilds`, porque ningún paquete lo usa (`pnpm why bcrypt` no lo encuentra). El `@ts-ignore` ya se había quitado en la Fase 0. `pnpm test` (45/45), `pnpm lint` y `pnpm build` en verde.
- **Tareas:** T013.
- **Decisiones:** al instalar, pnpm 11 muestra "Lockfile passes supply-chain policies". Es una verificación de la cadena de suministro que hace por defecto, pero no reemplaza a `pnpm audit` (T013b y T013c). pnpm avisa que salió la 12.11.2: no se actualiza por ahora.
- **Archivos tocados:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T013a (`unrs-resolver` en `allowBuilds`) y T013b (actualizar dependencias).

## 2026-10-13 — Tareas para los hallazgos de T012 (rama: fase-1-revision)
- **Hecho:** cada hallazgo de `hallazgos-fase-1.md` quedó asignado a una tarea.
- **Tareas:** nuevas en la Fase 1: T018a (inactivo → 404), T018b (normalizar el email), T018c (`PORT` con `ConfigService`) y T018d (opcional, `GET /health`). En la Fase 2: T022a (limitar CORS con `CORS_ORIGIN`). T013b ahora incluye fijar `@nestjs/mapped-types` y T020 suma los tests de inactivo → 404 y del email normalizado.
- **Decisiones:** **un registro borrado (inactivo) responde 404 para todos**, también para el administrador (decisión de Natalia). Si más adelante hace falta reactivar registros, se diseña aparte. T018b incluye revisar antes, en modo de solo lectura, si en la BD de desarrollo ya hay emails con mayúsculas o duplicados que solo difieran en ellas.
- **Archivos tocados:** `specs/001-salon_belleza-mvp/{task.md, hallazgos-fase-1.md, memory.md}`.
- **Siguiente paso:** T013–T013b (paquetes y vulnerabilidades) y luego T015–T018d.

## 2026-10-13 — T012: revisión del código existente (rama: fase-1-revision)
- **Hecho:** se revisaron `users`, `customers`, `app.module.ts`, `main.ts` y `app.controller.ts` (solo lectura, sin cambios de código). Los 22 hallazgos quedaron en `hallazgos-fase-1.md`, con la tarea que resuelve cada uno, para copiarlos en el PR.
- **Tareas:** T012.
- **Decisiones:**
  - Los más importantes: un UUID inválido en `customers` y los textos de más de 255 caracteres responden 500 en lugar de 400; `findOne`, `update` y `remove` no filtran por activo; el email de usuario no se normaliza a minúsculas, lo que afecta al login.
  - Lo que cambiaría la API o el esquema (rutas `/create` y `/all`, 204 en DELETE, fechas y `lastName` de `customers`) se anota pero no se toca en esta fase.
  - Los hallazgos sin tarea (#3, #4, #18, #19, #20, #21) esperan la decisión de Natalia antes de agregarse a `task.md`.
- **Archivos tocados:** `specs/001-salon_belleza-mvp/{hallazgos-fase-1.md (nuevo), task.md, memory.md}`.
- **Siguiente paso:** decidir los hallazgos sin tarea; luego T013–T013b.

## 2026-10-13 — Cierre de T010: baseline probada sobre una BD vacía (rama: fase-1-revision)
- **Hecho:** con autorización de Natalia se creó la BD local vacía `salon_belleza_t010`. `migration:run` (con `DB_NAME` como variable del sistema, sin tocar los `.env`) creó `users`, `customers` y `migrations` con los mismos nombres de PK y UNIQUE que en desarrollo. `migration:generate --dryrun` no encontró diferencias con las entidades. `migration:revert` borró las dos tablas y el registro, y otro `migration:run` las volvió a crear. La BD `salon_belleza` de desarrollo no se tocó.
- **Tareas:** T010 (con esto la Fase 0 queda completa).
- **Decisiones:** por decisión de Natalia, `salon_belleza_t010` **no se borró**, para revisarla en DBeaver. Queda pendiente borrarla a mano (`DROP DATABASE salon_belleza_t010`). La prueba se registra en la rama `fase-1-revision` porque la de la Fase 0 ya se fusionó.
- **Archivos tocados:** `specs/001-salon_belleza-mvp/{task.md, memory.md}` (no hubo cambios de código).
- **Siguiente paso:** T012 (revisión del código) y T013–T013b.

## 2026-10-13 — Auditoría de dependencias y nuevas tareas de la Fase 1 (rama: fase-1-revision)
- **Hecho:** se corrió `pnpm audit` por primera vez (solo lectura). Producción: 1 crítica (`proxy-addr`), 7 altas, 5 moderadas y 1 baja (`multer`, `qs`, `brace-expansion`, `typeorm` < 0.3.31). Contando las de dev: 3 críticas, 28 altas, 11 moderadas y 1 baja. `pnpm install` no revisa vulnerabilidades; lo único activo es el bloqueo de scripts de instalación de pnpm 11 (`allowBuilds`, aún sin decidir).
- **Tareas:** se agregaron T013a–T013d a la Fase 1 (decidir `allowBuilds`, actualizar dependencias, `pnpm audit --prod` en el flujo de cada fase y Dependabot opcional). Se usan sufijos para no renumerar T022+. T011 quedó marcada como hecha (PR #1).
- **Decisiones:** la actualización va en la Fase 1 porque es de revisión y no debe cambiar el comportamiento. Hoy no se usan subidas de archivos ni `trust proxy`, así que el riesgo real de `multer` y `proxy-addr` es bajo, pero igual se corrigen.
- **Archivos tocados:** `specs/001-salon_belleza-mvp/{task.md, memory.md}`.
- **Siguiente paso:** T012 (revisión del código) y T013–T013b.

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
