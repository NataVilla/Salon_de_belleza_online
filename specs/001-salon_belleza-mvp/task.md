# Tareas 001 — MVP de citas en línea del salón de belleza

Lista de tareas para implementar `spec.md` siguiendo `plan.md` (misma carpeta). Las fases van en el orden del plan y
cada una termina con tests en verde y su cierre en git antes de pasar a la siguiente.

**Convenciones**

- `- [ ] T001 [P] [BD] Descripción — archivo(s) — RF`
- `[P]`: se puede hacer en paralelo con las otras `[P]` de la misma fase (archivos distintos, sin dependencia entre sí).
- `[BD]`: la tarea **escribe en la base de datos** de desarrollo. Hay que pedir autorización antes de ejecutarla.
- `[x]`: tarea ya hecha.
- Dentro de cada fase el orden es: dependencias → migración/entidad → DTO → service → controller → tests → cierre git.

## Flujo de trabajo

**Ramas y commits (una rama por fase)**

1. Crear la rama de la fase desde `main` actualizado: `fase-0-base`, `fase-1-revision`, `fase-2-auth`, `fase-3-customers`,
   `fase-4-services`, `fase-5-stylists`, `fase-6-availability`, `fase-7-appointments`, `fase-8-seed`, `fase-9-cierre`.
2. Al terminar las tareas de la fase: `pnpm test`, `pnpm lint` y `pnpm build` en verde (y `pnpm test:e2e` si la fase tiene e2e),
   y `pnpm audit --prod --audit-level high` sin vulnerabilidades críticas ni altas (falla con código distinto de 0 si hay
   alguna). Si aparece una: `pnpm update`, luego `pnpm audit --fix=update` y, como último recurso, `overrides`; un aviso
   sin versión corregida solo se ignora en `auditConfig.ignoreGhsas` con un comentario que explique por qué.
3. Crear el commit con un mensaje convencional en español (por ejemplo, `feat(auth): login con bloqueo por intentos`).
4. **La usuaria revisa el diff y da el visto bueno.** Sin visto bueno no hay push.
5. `git push -u origin <rama>` y abrir el Pull Request hacia `main`. Como `gh` no está instalado, el PR se abre desde el
   enlace que imprime el push.
6. La usuaria hace el merge en GitHub. Después: `git checkout main` y `git pull`.

Nunca se hace push directo a `main`, ni push o merge sin el visto bueno. Remoto (HTTPS, desde el 2026-10-06):
`https://github.com/NataVilla/Salon_de_belleza_online.git`. La autenticación la hace Git Credential Manager (cuenta `NataVilla`)
y git usa el almacén de certificados de Windows (`http.sslBackend schannel`).

**Acceso a la base de datos**

- Las consultas de solo lectura (SELECT, ver el esquema) están permitidas sin preguntar, **solo en desarrollo**.
  Se hacen con un script de Node que usa `pg` y las credenciales de `.env.development` (no hay `psql`).
- Toda escritura se pide antes: `migration:run`/`migration:revert`, `pnpm seed`, INSERT/UPDATE/DELETE, ALTER/CREATE,
  e2e o pruebas k6 que escriben en la BD. Estas tareas llevan la marca `[BD]`.
- Las bases de datos de QA y producción no se tocan nunca.

---

## Fase 0 — Base común · rama `fase-0-base`

- [x] T001 `ConfigModule` con un `.env` por ambiente, validación de variables obligatorias (`REQUIRED_ENV`) y TypeORM con `forRootAsync` — `src/app.module.ts`, `.env.example`
- [x] T002 `bcryptjs` en `dependencies` — `package.json`
- [x] T003 Crear la rama y versionar los archivos que aún no están en git: `CLAUDE.md`, `README.md`, `docs/`, `specs/`, `railway.yml`, `volume-tests/`. Comprobar que no entra ningún `.env.*`
- [x] T004 [P] `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) — registrado con `APP_PIPE` en `src/app.module.ts` (no en `main.ts`) para que los e2e también lo tengan
- [x] T005 [P] Filtro global de errores de BD: `23505` → 400 con el campo duplicado, `23P01` → 409 — `src/common/filters/db-exception.filter.ts` (`APP_FILTER`, + spec)
- [x] T006 [P] Enum `Role` (`customer`, `stylist`, `admin`) — `src/common/enums/role.enum.ts`
- [x] T007 [P] Helpers de fecha y hora en America/Bogota (UTC-5 fijo): inicio y fin de día y de semana, formato ISO con `-05:00` — `src/common/time/bogota.ts` (+ `bogota.spec.ts`, que cubre el cambio de día y de mes cerca de la medianoche)
- [x] T008 Comparar (solo lectura) el esquema real de `users` y `customers` en la BD de desarrollo con sus entidades (la conexión ya funciona)
- [x] T009 `DataSource` para el CLI y scripts `typeorm`, `migration:generate`, `migration:run`, `migration:revert` y `seed` — `src/database/data-source.ts`, `package.json`
- [x] T010 [BD] Migración **baseline** con `users` y `customers` tal como existen hoy; probar `migration:run` sobre una BD vacía — `src/database/migrations/`
  - La baseline quedó registrada en la BD de desarrollo el 2026-10-09 (usa `IF NOT EXISTS`). El 2026-10-13, con autorización, se probó en una BD local vacía (`salon_belleza_t010`): `migration:run`, `migration:generate --dryrun` sin diferencias, `migration:revert` y `migration:run` otra vez, todo correcto.
  - [x] T010a Pasar `eslint.config.mjs` a flat config (ESLint 9 no cargaba el formato anterior) con las mismas reglas; `endOfLine: auto` en `.prettierrc`
- [x] T011 Cierre git de la fase (ver _Flujo de trabajo_) — PR #1, merge el 2026-10-09

**Hecho cuando:** `pnpm build`, `pnpm lint` y `pnpm test` pasan, la app arranca leyendo el `.env` y `migration:run` funciona sobre una BD vacía.

---

## Fase 1 — Revisión del código existente · rama `fase-1-revision`

Objetivo: dejar limpio lo que ya existe antes de construir encima. Se optimiza **sin cambiar el comportamiento**.
`users` se mantiene: su entidad sigue siendo la tabla `users` (la cuenta de todo usuario) y Auth lo va a reutilizar.

- [x] T012 Revisar `src/users/`, `src/customers/`, `src/app.module.ts`, `src/main.ts` y `src/app.controller.ts`, y anotar los hallazgos (bugs, duplicación, `findOne` repetido, manejo de `23505`, mensajes en español, validaciones de DTO, tipos). La lista va en la descripción del PR
  - Hallazgos en `hallazgos-fase-1.md` (22 puntos). Cada hallazgo tiene su tarea; para los que no tenían ninguna se crearon T018a–T018d y T022a, y el #18 se sumó a T013b.
- [x] T013 [P] Quitar `bcrypt` de `pnpm-workspace.yaml`, eliminar `@types/bcryptjs` y el `@ts-ignore` de `src/users/users.service.ts` (el `@ts-ignore` ya se quitó en la Fase 0 por el lint)
- [x] T013a [P] Decidir `unrs-resolver` en `allowBuilds` (`false`, salvo que lint o test fallen sin su script de instalación) — `pnpm-workspace.yaml`
- [x] T013b Actualizar dependencias para cerrar las vulnerabilidades de `pnpm audit` (el 2026-10-13: producción 1 crítica, 7 altas, 5 moderadas, 1 baja; con dev 3 críticas y 28 altas). Prioridad: `proxy-addr`, `multer`, `qs` (vía express/`@nestjs/platform-express`), `typeorm` ≥ 0.3.31 y `brace-expansion`; luego las de dev (`handlebars`, `js-yaml`, `fast-uri`). Usar `pnpm update` y, si una dependencia indirecta no sube, `overrides` en `pnpm-workspace.yaml`. Fijar también la versión de `@nestjs/mapped-types`, que hoy está en `"*"` (hallazgo #18), y agregar `"packageManager": "pnpm@11.13.0"` para que la máquina local y Railway usen el mismo pnpm (se queda en la 11; la 12 sería una tarea aparte). Sin cambiar el comportamiento: test, lint y build en verde — `package.json`, `pnpm-lock.yaml`
  - Resultado: `pnpm audit --prod` sin vulnerabilidades; con dev, 0 salvo `sprintf-js` (moderada, sin versión corregida publicada), ignorada y documentada en `pnpm-workspace.yaml`. No se subió ninguna versión mayor (NestJS 12, TypeORM 1.x, TypeScript 7 y ESLint 10 quedan fuera de esta fase).
- [x] T013c Agregar `pnpm audit --prod` (sin vulnerabilidades críticas ni altas) al paso 2 del _Flujo de trabajo_, para que cada fase lo corra antes del commit — `task.md`, `CLAUDE.md`
- [ ] T013d [P] (opcional, la hace Natalia en GitHub) Activar solo las **alertas** de Dependabot (Settings → _Code security_ → _Dependabot alerts_) para recibir avisos de vulnerabilidades nuevas sin esperar al cierre de fase. Sin `dependabot.yml` ni PRs automáticos hasta que haya CI que corra tests en cada PR. Después de activarlas, comprobar en la pestaña Security que Dependabot lee el lockfile de pnpm 11
- [x] T014 [P] (adelantada a la Fase 0) Arreglar `users.service.spec.ts` y `users.controller.spec.ts` con mock de `getRepositoryToken(User)` (patrón de `customers`)
- [x] T015 [P] Renombrar `create-user-dto.ts` → `create-customer.dto.ts` (y `update-customer-dto.ts` → `update-customer.dto.ts`) y actualizar los imports — `src/customers/dto/`
- [x] T016 [P] `ParseUUIDPipe` en las rutas `:id` de customers — `src/customers/customers.controller.ts`
- [x] T017 Decoradores de class-validator completos y coherentes en los DTO de `users` y `customers`, ahora que el `ValidationPipe` global los aplica
  - Reglas (decididas por Natalia el 2026-10-13): contraseña de 8 a 72 caracteres, celular de 10 dígitos, documento solo con números (máximo 20). Textos con `@Trim()` (`src/common/decorators/trim.decorator.ts`) y máximo 255. Mensajes en español. Tests en `src/{users,customers}/dto/*.dto.spec.ts`.
  - Datos existentes: 10 de los 13 clientes de la BD de desarrollo tienen un celular que no es de 10 dígitos (de 7 a 11). No se tocaron; las reglas solo aplican a lo que se envía al crear o editar.
- [x] T018 Unificar el manejo de errores: delegar `23505` al filtro global de T005, evitar búsquedas repetidas y mantener los mensajes en español
  - Ajuste (decisión de Natalia, 2026-10-13): el 404 no incluye el UUID, que es un dato interno: "Cliente no encontrado." / "Usuario no encontrado.". No se agrega búsqueda por cédula por ahora.
- [x] T018a Un registro borrado (inactivo) responde **404 para todos** (decisión de Natalia, 2026-10-13): `findOne`, `update` y `remove` de `users` y `customers` buscan solo activos, igual que `findAll` (hallazgo #3) — `src/users/users.service.ts`, `src/customers/customers.service.ts`
- [x] T018b Normalizar el email de `users` (`trim` + minúsculas) al crear y al actualizar, para que `Ana@x.com` y `ana@x.com` sean el mismo usuario; `findByEmail` (T019) busca con el email normalizado. Antes, revisar en la BD de desarrollo (solo lectura) si ya hay emails con mayúsculas o duplicados que solo difieran en ellas (hallazgo #4) — `src/users/`
- [x] T018c [P] `main.ts` lee `PORT` con `ConfigService` en lugar de `process.env` (hallazgo #20) — `src/main.ts`
- [x] T018d [P] (opcional) Cambiar `GET /` ("Hello World!") por `GET /health`, que responda el estado de la app y de la conexión a la BD, para Railway (hallazgo #21) — `src/app.controller.ts`, `src/app.service.ts`
  - `GET /health` → 200 `{ status: 'ok', database: 'up' }` o 503 `{ status: 'error', database: 'down' }` (`SELECT 1` con `DataSource`, sin dependencias nuevas). `GET /` ahora responde 404. Para que Railway lo use, hay que configurar la ruta del healthcheck en su panel.
- [x] T019 Preparar `users` para Auth: exportar `UsersService` desde `UsersModule` y agregar `findByEmail` (con la contraseña para el login; `@Exclude` solo afecta la serialización) — `src/users/`
- [x] T020 Tests de lo que cambió: `findByEmail`, DTO inválido → 400, UUID inválido → 400, duplicado → 400 con el campo, registro inactivo → 404 y email normalizado
  - La mayoría se escribió en cada tarea (T017–T019). Aquí se agregaron `src/common/pipes/uuid.pipe.spec.ts` y `test/validation.e2e-spec.ts` (UUID inválido y DTO inválido → 400 a nivel HTTP; no escribe en la BD). Total: 86 unitarios y 11 e2e.
- [ ] T021 Cierre git de la fase (los hallazgos de T012 van en el PR)
  - Commit hecho el 2026-10-13 en `fase-1-revision`. Falta el visto bueno de Natalia, el push y el PR (texto: `hallazgos-fase-1.md`).

---

## Fase 2 — Auth (RF-1 a RF-9) · rama `fase-2-auth`

No se crea otro módulo de usuarios. `AuthModule` importa `UsersModule` y usa `UsersService`, y las columnas nuevas se agregan a la entidad `User` existente.

- [ ] T022 Instalar `@nestjs/jwt`; agregar `JWT_SECRET` a `.env.example`, a los `.env.*` locales y a `REQUIRED_ENV`
- [ ] T022a [P] Limitar CORS: hoy `origin: true` con `credentials: true` deja que cualquier sitio haga peticiones con credenciales. Leer los orígenes permitidos de `CORS_ORIGIN` (lista separada por comas) y agregarla a `.env.example`, a los `.env.*` locales y a `REQUIRED_ENV` (hallazgo #19) — `src/main.ts`, `src/config/env.ts`
- [ ] T023 [BD] Migración: `users` + `role` (enum), `failed_login_attempts` (int, default 0), `is_locked` (bool, default false); tabla `sessions` (`id`, `user_id`, `last_activity_at`, `revoked_at`, `created_at`). Se genera sin autorización; la ejecución se pide
- [ ] T024 [P] Agregar `role`, `failedLoginAttempts` e `isLocked` a la entidad `User` — `src/users/entities/user.entity.ts`
- [ ] T025 [P] Entidad `Session` — `src/auth/entities/session.entity.ts`
- [ ] T026 [P] DTOs `RegisterDto` (nombre, apellidos, email, celular, documento y contraseña, todos obligatorios) y `LoginDto` — `src/auth/dto/` — RF-1
- [ ] T027 [P] Decoradores `@Public()`, `@Roles()` y `@CurrentUser()` — `src/auth/decorators/`
- [ ] T028 `AuthService.register`: crea el `user` (rol `customer`) y el `customer` en una transacción, con la contraseña hasheada y una respuesta sin contraseña. Email o documento duplicado → 400 indicando el dato — RF-1, RF-2, RF-9
- [ ] T029 `AuthService.login`: con credenciales correctas crea una sesión y devuelve `{ accessToken, role }` (payload `{ sub, role, sid }`). Usuario inexistente o contraseña incorrecta → 401 genérico "usuario o contraseña incorrectos". Cada fallo suma al contador y al tercero se bloquea la cuenta. Cuenta bloqueada → 403 aunque la contraseña sea correcta. Un login exitoso reinicia el contador — RF-3, RF-4, RF-5, RF-6
- [ ] T030 `AuthService`: `logout` (revoca la sesión), `me`, `unlock` (`is_locked=false`, contador en 0) y `resetPassword` (admin) — RF-6, RF-9
- [ ] T031 `AuthGuard` global (`APP_GUARD`): respeta `@Public()`, verifica el JWT, carga la sesión, la rechaza si está revocada o lleva más de 15 min sin actividad (401) y actualiza `last_activity_at` — `src/auth/auth.guard.ts` — RF-8
- [ ] T032 `RolesGuard` global con `Reflector`: si la ruta no tiene `@Roles()`, basta con estar autenticado; si no tiene el rol → 403 — `src/auth/roles.guard.ts` — RF-7
- [ ] T033 `AuthController`: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/users/:id/unlock`, `PATCH /auth/users/:id/password` — `src/auth/auth.controller.ts`, `src/auth/auth.module.ts`, `src/app.module.ts`
- [ ] T034 `UsersController` pasa a ser solo para `admin` (incluido `POST /users/create`) — `src/users/users.controller.ts` — RF-7
- [ ] T035 [P] Tests unitarios de `AuthService`: registro duplicado, hash, contador, bloqueo al tercer intento, cuenta bloqueada con contraseña correcta y desbloqueo — `src/auth/auth.service.spec.ts`
- [ ] T036 [P] Tests de los guards: `@Public`, roles (403), sesión expirada a los 15 min con reloj simulado, sesión revocada — `src/auth/*.guard.spec.ts`
- [ ] T037 [BD] E2E registro → login → `/auth/me` → logout → `/auth/me` responde 401 — `test/auth.e2e-spec.ts`
- [ ] T038 Cierre git de la fase

**Hecho cuando:** RF-1 a RF-9 tienen tests en verde y una ruta sin `@Public()` responde 401 sin token.

---

## Fase 3 — Customers (RF-22, RF-24, RF-31) · rama `fase-3-customers`

- [ ] T039 [BD] Migración: `customers.user_id` FK única (1:1 con `users`)
- [ ] T040 Relación `customer.user` en la entidad, conservando `isActivate` y el borrado lógico — `src/customers/entities/customer.entity.ts`
- [ ] T041 `GET /customers/me` y `PATCH /customers/me` (rol `customer`): leer y actualizar su perfil (nombre, apellidos, celular) — RF-22, RF-24, RF-31
- [ ] T042 Las rutas CRUD existentes (`/customers/create`, `/all`, `/:id`) quedan solo para `admin`
- [ ] T043 Adaptar `customers.*.spec.ts` y agregar el caso "un cliente solo ve y edita su propio perfil"
- [ ] T044 Cierre git de la fase

---

## Fase 4 — Services, el catálogo (RF-10) · rama `fase-4-services`

- [ ] T045 [BD] Entidad `Service` (`name` único, `description`, `durationMinutes` null, `price` numeric(10,2) null, `imageUrl`, `isActive`) y su migración — `src/services/`
- [ ] T046 `ServicesService` y `ServicesController`: `GET /services/all` (público, solo activos) y `GET /services/:id` (público, `ParseUUIDPipe`) — RF-10
- [ ] T047 Tests: el listado excluye los inactivos y devuelve `durationMinutes` y `price` como `null` sin romper la respuesta
- [ ] T048 Cierre git de la fase

---

## Fase 5 — Stylists (RF-11, RF-12) · rama `fase-5-stylists`

- [ ] T049 [BD] Entidades `Stylist` (`user_id` único, `displayName`, `photoUrl`, `isActive`) y relación ManyToMany `stylist_services`, con su migración — `src/stylists/`
- [ ] T050 `GET /stylists/all?serviceId=` (público): solo estilistas activos que prestan el servicio — RF-11, RF-12
- [ ] T051 `GET /stylists/me` (`stylist`, `admin`): su propio registro de estilista
- [ ] T052 Tests: filtro por servicio y exclusión de los estilistas inactivos
- [ ] T053 Cierre git de la fase

---

## Fase 6 — Availability, la agenda (RF-13 a RF-19) · rama `fase-6-availability`

- [ ] T054 [BD] Migración: extensión `btree_gist` y tabla `availability_blocks` con `CHECK (ends_at > starts_at)`, `EXCLUDE USING gist` por estilista sobre `tstzrange(starts_at, ends_at)` entre bloques no eliminados, `change_note` y `deleted_at`
- [ ] T055 [P] Entidad `AvailabilityBlock` — `src/availability/entities/`
- [ ] T056 [P] DTOs: crear (lista de bloques con fecha, inicio y fin), editar y eliminar con `note` obligatoria; rangos `from`/`to` — `src/availability/dto/` — RF-16
- [ ] T057 `POST /availability/create`: guarda uno o varios bloques en una transacción. Rechaza los bloques pasados (400) y los solapados o con fin ≤ inicio (409, indicando el conflicto) — RF-13, RF-14, RF-15
- [ ] T058 `PATCH /availability/:id` y `DELETE /availability/:id` (borrado lógico), ambos con nota obligatoria. En la misma transacción marcan `needs_reschedule = true` en las citas `pendiente` que quedan fuera de todo bloque vigente, y las devuelven — RF-16, RF-17
- [ ] T059 `SELECT ... FOR UPDATE` sobre la fila del estilista al editar o eliminar bloques (la reserva de la Fase 7 usa el mismo bloqueo)
- [ ] T060 `GET /availability/me?from=&to=` (el estilista se toma del token) y `GET /availability/stylist/:stylistId?from=&to=`, solo para `admin` y de lectura — RF-19
- [ ] T061 Al inactivar un estilista, sus citas `pendiente` quedan `needs_reschedule` (caso límite de la spec)
- [ ] T062 Tests: solapamiento, bloque pasado, fin ≤ inicio, nota obligatoria, que el estilista no edite bloques ajenos y que el admin no edite agendas (403) — RF-13 a RF-19
- [ ] T063 Cierre git de la fase

> Los tests de RF-17 y de T061 necesitan la tabla `appointments`, así que se escriben en la Fase 7 (T081).

---

## Fase 7 — Appointments: reserva, gestión y estados (RF-18, RF-20 a RF-36) · rama `fase-7-appointments`

**Modelo**

- [ ] T064 Instalar `@nestjs/schedule` y registrar `ScheduleModule.forRoot()` en `src/app.module.ts`
- [ ] T065 [BD] Migración: enums `appointment_status` (`pendiente | en_curso | cerrada | cancelada`) y `cancelled_by` (`cliente | estilista | sistema`); tabla `appointments` con `needs_reschedule`, `cancel_reason` y `price_at_booking`; `EXCLUDE` por estilista y por cliente cuando `status IN ('pendiente','en_curso')` — RF-25, RF-32
- [ ] T066 Entidad `Appointment` y enums en TypeScript — `src/appointments/entities/`

**Horarios y reserva**

- [ ] T067 Cálculo de horarios: pasos de 30 min (`SLOT_STEP_MINUTES`), ventana de 30 días y duración `durationMinutes ?? 60`. El intervalo `[inicio, fin)` debe caber en un bloque y no chocar con citas `pendiente`/`en_curso` — RF-20
- [ ] T068 `GET /appointments/slots?stylistId=&serviceId=&from=&to=` (cliente). Sin horarios → `{ slots: [], alternativeStylists: [...] }` — RF-20, RF-21
- [ ] T069 `POST /appointments/create` (cliente), en una transacción: bloquea al estilista; valida que el horario cae en un bloque, que es futuro y que el estilista y el servicio están activos y relacionados; actualiza el perfil si cambiaron nombre, apellidos o celular; crea la cita `pendiente` con `price_at_booking` y devuelve el resumen. `23P01` → 409 "el horario ya fue tomado" — RF-22, RF-23, RF-24, RF-25 (RF-26 no necesita backend)

**Gestión del cliente**

- [ ] T070 `GET /appointments/me?status=`: citas pendientes e histórico del cliente — RF-27, RF-31
- [ ] T071 `PATCH /appointments/:id/reschedule`: solo citas `pendiente` y con ≥ 24 h de antelación (inclusivo, contra el `starts_at` actual). Revalida el horario como una reserva nueva. Si faltan menos → 409 indicando que debe cancelar y reservar otra — RF-28, RF-28a, RF-30
- [ ] T072 `PATCH /appointments/:id/cancel`: solo citas `pendiente` y con ≥ 15 min de antelación (inclusivo); guarda `cancelled_by = cliente`. En curso, cerrada, cancelada o pasada → 409 — RF-29, RF-29a, RF-30, RF-35a
- [ ] T073 Pertenencia: si la cita no es del cliente del token → 404 — RF-31

**Personal**

- [ ] T074 `GET /appointments/calendar?from=&to=&stylistId=&serviceId=`: el estilista ve solo sus citas (del día o la semana, con cliente, servicio, hora y estado); el admin ve todas. Lista vacía → mensaje de disponibilidad — RF-18, RF-36
- [ ] T075 Transiciones con `UPDATE ... WHERE id = :id AND status = :esperado`; si no afecta filas → 409 — RF-32
- [ ] T076 `PATCH /appointments/:id/start` (`pendiente → en_curso`, hasta `starts_at + 10 min` inclusive), `PATCH /appointments/:id/close` (`en_curso → cerrada`) y `PATCH /appointments/:id/no-show` (`pendiente → cancelada`, `estilista`, `no_asistio`). El estilista solo actúa sobre sus propias citas — RF-33, RF-34, RF-35a
- [ ] T077 `appointments.scheduler.ts`: `@Cron` cada minuto con un solo `UPDATE` que cancela las citas `pendiente` con `starts_at + 10 min < now()` (`sistema`, `no_asistio`). Nunca toca las citas `en_curso` — RF-35, RF-35a

**Tests**

- [ ] T078 [P] Unitarios de horarios: bordes de bloque, duración `null`, citas contiguas permitidas, servicio que no cabe al final del bloque
- [ ] T079 [P] Unitarios de reglas: límites inclusivos de 24 h, 15 min (a los 14 min 59 s se rechaza) y 10 min, transiciones inválidas, pertenencia, cliente con citas superpuestas con distintos estilistas
- [ ] T080 [P] Scheduler con reloj simulado: cancela las pendientes vencidas, ignora las `en_curso` y la carrera con `start` no deja la cita en un estado inconsistente
- [ ] T081 Tests pendientes de la Fase 6: RF-17 (las citas que quedan fuera del bloque pasan a `needs_reschedule`) e inactivación de estilista (T061)
- [ ] T082 [BD] E2E de concurrencia: dos reservas simultáneas del mismo horario → exactamente una responde 201 y la otra 409 — `test/appointments-concurrency.e2e-spec.ts` — RF-25
- [ ] T083 Cierre git de la fase

---

## Fase 8 — Datos semilla · rama `fase-8-seed`

- [ ] T084 Agregar `SEED_ADMIN_PASSWORD`, `SEED_OLGA_PASSWORD` y `SEED_PATRICIA_PASSWORD` a `.env.example` y a los `.env.*` locales; el script las valida al arrancar
- [ ] T085 `src/database/seeds/seed.ts` idempotente (_upsert_ por `users.email`, `services.name` y la PK de `stylist_services`):
  - Servicios: corte de cabello, cepillado, alisado, manicura y pedicura (duración y precio `null`).
  - Marys Angelica (`admin`, `marys@salon.local`): corte, cepillado, alisado.
  - Olga Osorio (`stylist`, `olga@salon.local`): corte, cepillado, alisado, manicura, pedicura.
  - Patricia Rodas (`stylist`, `patricia@salon.local`): manicura, pedicura.
- [ ] T086 [BD] Ejecutar `pnpm seed` dos veces y comprobar que no se duplican registros
- [ ] T087 Cierre git de la fase

---

## Fase 9 — Cierre · rama `fase-9-cierre`

- [ ] T088 [BD] E2E del flujo principal: registro → login → catálogo → estilista → horario → reservar → el estilista inicia la cita (_en curso_) → la cierra — `test/main-flow.e2e-spec.ts`
- [ ] T089 [BD] Script k6 `volume-tests/appointments.load.js` (consulta de horarios y reserva) con p95 < 500 ms y menos del 1 % de errores con 20 usuarios
- [ ] T090 Actualizar `CLAUDE.md`: módulo `auth`, rutas privadas por defecto con `@Public()`, migraciones, _seed_, `ValidationPipe` global, comandos nuevos y el flujo de ramas y PR
- [ ] T091 Comprobar que cada RF tiene al menos un test y correr `pnpm test`, `pnpm test:e2e`, `pnpm lint` y `pnpm build` sin errores
- [ ] T092 Demo manual del flujo principal con los tres roles (cliente, estilista y administradora)
- [ ] T093 Cierre git de la fase (PR final del MVP)

---

## Dependencias entre fases

```
Fase 0 → Fase 1 → Fase 2 ─┬→ Fase 3 ─────────────────────────┐
                          └→ Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8 → Fase 9
```

- Las fases 3 y 4 dependen solo de Auth y pueden avanzar en paralelo, cada una en su rama.
- La Fase 7 necesita clientes (3), servicios (4), estilistas (5) y agenda (6).
- El _seed_ (Fase 8) puede adelantarse en cuanto existan servicios y estilistas, para probar a mano las fases 6 y 7.

## Trazabilidad RF → tareas

| RF                   | Tareas                                |
| -------------------- | ------------------------------------- |
| RF-1, RF-2           | T026, T028, T035, T037                |
| RF-3 a RF-6          | T029, T030, T035                      |
| RF-7                 | T032, T034, T036                      |
| RF-8                 | T031, T036, T037                      |
| RF-9                 | T028, T030, T035                      |
| RF-10                | T045–T047                             |
| RF-11, RF-12         | T050, T052, T061                      |
| RF-13 a RF-16        | T056–T058, T062                       |
| RF-17                | T058, T081                            |
| RF-18                | T074                                  |
| RF-19                | T060, T062                            |
| RF-20, RF-21         | T067, T068, T078                      |
| RF-22, RF-24         | T041, T069                            |
| RF-23, RF-25         | T065, T069, T082                      |
| RF-26                | sin backend (no se llama al endpoint) |
| RF-27                | T070                                  |
| RF-28, RF-28a        | T071, T079                            |
| RF-29, RF-29a, RF-30 | T072, T079                            |
| RF-31                | T041, T070, T073, T079                |
| RF-32                | T065, T075, T079                      |
| RF-33, RF-34         | T076, T079                            |
| RF-35, RF-35a        | T072, T076, T077, T080                |
| RF-36                | T074                                  |

## Pendientes y bloqueos (de `plan.md` §6)

- ✅ BD local: la conexión con `.env.development` funciona (verificado el 2026-10-06: PostgreSQL 17.9, BD `salon_belleza`).
- GitHub CLI (opcional): `winget install GitHub.cli` y luego `gh auth login`, para abrir los PR desde la terminal. Mientras no esté instalado, el PR se abre desde el enlace que imprime el push.
- Railway: crear las variables en el panel, confirmar que `NODE_ENV=production` esté definido y cambiar la contraseña que estuvo escrita en el código.
- `.env.qa`: vacío hasta que exista la BD de QA.
- Duración y precio reales de los servicios: siguen en `null`, y mientras tanto rige la duración por defecto de 60 min.
- Decisiones del plan fáciles de cambiar: horarios cada 30 min, ventana de 30 días y permitir iniciar la cita antes de la hora agendada.
