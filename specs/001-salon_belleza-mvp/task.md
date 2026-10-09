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
2. Al terminar las tareas de la fase: `pnpm test`, `pnpm lint` y `pnpm build` en verde (y `pnpm test:e2e` si la fase tiene e2e).
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
- [ ] T010 [BD] Migración **baseline** con `users` y `customers` tal como existen hoy; probar `migration:run` sobre una BD vacía — `src/database/migrations/`
  - Parcial: la baseline existe y quedó registrada en la BD de desarrollo (usa `IF NOT EXISTS`). Falta la prueba sobre una BD vacía, que necesita autorización para crear una BD temporal.
- [x] T010a Pasar `eslint.config.mjs` a flat config (ESLint 9 no cargaba el formato anterior) con las mismas reglas; `endOfLine: auto` en `.prettierrc`
- [ ] T011 Cierre git de la fase (ver *Flujo de trabajo*)

**Hecho cuando:** `pnpm build`, `pnpm lint` y `pnpm test` pasan, la app arranca leyendo el `.env` y `migration:run` funciona sobre una BD vacía.

---

## Fase 1 — Revisión del código existente · rama `fase-1-revision`

Objetivo: dejar limpio lo que ya existe antes de construir encima. Se optimiza **sin cambiar el comportamiento**.
`users` se mantiene: su entidad sigue siendo la tabla `users` (la cuenta de todo usuario) y Auth lo va a reutilizar.

- [ ] T012 Revisar `src/users/`, `src/customers/`, `src/app.module.ts`, `src/main.ts` y `src/app.controller.ts`, y anotar los hallazgos (bugs, duplicación, `findOne` repetido, manejo de `23505`, mensajes en español, validaciones de DTO, tipos). La lista va en la descripción del PR
- [ ] T013 [P] Quitar `bcrypt` de `pnpm-workspace.yaml`, eliminar `@types/bcryptjs` y el `@ts-ignore` de `src/users/users.service.ts` (el `@ts-ignore` ya se quitó en la Fase 0 por el lint)
- [x] T014 [P] (adelantada a la Fase 0) Arreglar `users.service.spec.ts` y `users.controller.spec.ts` con mock de `getRepositoryToken(User)` (patrón de `customers`)
- [ ] T015 [P] Renombrar `create-user-dto.ts` → `create-customer.dto.ts` (y `update-customer-dto.ts` → `update-customer.dto.ts`) y actualizar los imports — `src/customers/dto/`
- [ ] T016 [P] `ParseUUIDPipe` en las rutas `:id` de customers — `src/customers/customers.controller.ts`
- [ ] T017 Decoradores de class-validator completos y coherentes en los DTO de `users` y `customers`, ahora que el `ValidationPipe` global los aplica
- [ ] T018 Unificar el manejo de errores: delegar `23505` al filtro global de T005, evitar búsquedas repetidas y mantener los mensajes en español
- [ ] T019 Preparar `users` para Auth: exportar `UsersService` desde `UsersModule` y agregar `findByEmail` (con la contraseña para el login; `@Exclude` solo afecta la serialización) — `src/users/`
- [ ] T020 Tests de lo que cambió: `findByEmail`, DTO inválido → 400, UUID inválido → 400, duplicado → 400 con el campo
- [ ] T021 Cierre git de la fase (los hallazgos de T012 van en el PR)

---

## Fase 2 — Auth (RF-1 a RF-9) · rama `fase-2-auth`

No se crea otro módulo de usuarios. `AuthModule` importa `UsersModule` y usa `UsersService`, y las columnas nuevas se agregan a la entidad `User` existente.

- [ ] T022 Instalar `@nestjs/jwt`; agregar `JWT_SECRET` a `.env.example`, a los `.env.*` locales y a `REQUIRED_ENV`
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
- [ ] T085 `src/database/seeds/seed.ts` idempotente (*upsert* por `users.email`, `services.name` y la PK de `stylist_services`):
  - Servicios: corte de cabello, cepillado, alisado, manicura y pedicura (duración y precio `null`).
  - Marys Angelica (`admin`, `marys@salon.local`): corte, cepillado, alisado.
  - Olga Osorio (`stylist`, `olga@salon.local`): corte, cepillado, alisado, manicura, pedicura.
  - Patricia Rodas (`stylist`, `patricia@salon.local`): manicura, pedicura.
- [ ] T086 [BD] Ejecutar `pnpm seed` dos veces y comprobar que no se duplican registros
- [ ] T087 Cierre git de la fase

---

## Fase 9 — Cierre · rama `fase-9-cierre`

- [ ] T088 [BD] E2E del flujo principal: registro → login → catálogo → estilista → horario → reservar → el estilista inicia la cita (*en curso*) → la cierra — `test/main-flow.e2e-spec.ts`
- [ ] T089 [BD] Script k6 `volume-tests/appointments.load.js` (consulta de horarios y reserva) con p95 < 500 ms y menos del 1 % de errores con 20 usuarios
- [ ] T090 Actualizar `CLAUDE.md`: módulo `auth`, rutas privadas por defecto con `@Public()`, migraciones, *seed*, `ValidationPipe` global, comandos nuevos y el flujo de ramas y PR
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
- El *seed* (Fase 8) puede adelantarse en cuanto existan servicios y estilistas, para probar a mano las fases 6 y 7.

## Trazabilidad RF → tareas

| RF | Tareas |
|---|---|
| RF-1, RF-2 | T026, T028, T035, T037 |
| RF-3 a RF-6 | T029, T030, T035 |
| RF-7 | T032, T034, T036 |
| RF-8 | T031, T036, T037 |
| RF-9 | T028, T030, T035 |
| RF-10 | T045–T047 |
| RF-11, RF-12 | T050, T052, T061 |
| RF-13 a RF-16 | T056–T058, T062 |
| RF-17 | T058, T081 |
| RF-18 | T074 |
| RF-19 | T060, T062 |
| RF-20, RF-21 | T067, T068, T078 |
| RF-22, RF-24 | T041, T069 |
| RF-23, RF-25 | T065, T069, T082 |
| RF-26 | sin backend (no se llama al endpoint) |
| RF-27 | T070 |
| RF-28, RF-28a | T071, T079 |
| RF-29, RF-29a, RF-30 | T072, T079 |
| RF-31 | T041, T070, T073, T079 |
| RF-32 | T065, T075, T079 |
| RF-33, RF-34 | T076, T079 |
| RF-35, RF-35a | T072, T076, T077, T080 |
| RF-36 | T074 |

## Pendientes y bloqueos (de `plan.md` §6)
- ✅ BD local: la conexión con `.env.development` funciona (verificado el 2026-10-06: PostgreSQL 17.9, BD `salon_belleza`).
- GitHub CLI (opcional): `winget install GitHub.cli` y luego `gh auth login`, para abrir los PR desde la terminal. Mientras no esté instalado, el PR se abre desde el enlace que imprime el push.
- Railway: crear las variables en el panel, confirmar que `NODE_ENV=production` esté definido y cambiar la contraseña que estuvo escrita en el código.
- `.env.qa`: vacío hasta que exista la BD de QA.
- Duración y precio reales de los servicios: siguen en `null`, y mientras tanto rige la duración por defecto de 60 min.
- Decisiones del plan fáciles de cambiar: horarios cada 30 min, ventana de 30 días y permitir iniciar la cita antes de la hora agendada.
