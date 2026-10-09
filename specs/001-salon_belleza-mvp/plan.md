# Plan 001 — MVP de citas en línea del salón de belleza

Plan técnico para implementar `spec.md` (misma carpeta). La spec dice **qué** hace el sistema; este plan dice **cómo** y
**en qué orden**, módulo por módulo. Cada fase termina con tests en verde antes de pasar a la siguiente.

Documentación consultada (Context7, oct-2026): NestJS (*security/authentication*, *authorization*, *guards*,
*task-scheduling*) y TypeORM 0.3 (*migrations*).

---

## 1. Decisiones técnicas transversales

| Tema | Decisión | Motivo |
|---|---|---|
| Autenticación | `@nestjs/jwt` + `AuthGuard` propio registrado como guard global (`APP_GUARD`) y decorador `@Public()` | Patrón oficial de NestJS. **No** se usa `@nestjs/authentication`: está en v0.0.1 y exige Nest 12 (el proyecto usa Nest 11.1). No se usa Passport: no aporta nada con una sola estrategia. |
| Autorización | Enum `Role` (`customer`, `stylist`, `admin`), decorador `@Roles()` y `RolesGuard` global que lee los roles con `Reflector` | Patrón oficial de NestJS. Cubre RF-7. |
| Sesión de 15 min por inactividad (RF-8) | Tabla `sessions`. El JWT lleva `sid`; el guard rechaza la sesión si `last_activity_at` tiene más de 15 min y, si no, la actualiza | Un JWT solo no puede medir inactividad. Además permite `logout`. |
| Contraseñas (RF-9) | `bcryptjs`, 10 *rounds* (como ya hace `UsersService`) | Ya está en uso; se agrega a `dependencies` y se quita el `@ts-ignore` (bcryptjs 3 trae sus tipos). Se elimina `bcrypt` (nativo) de `pnpm-workspace.yaml`. |
| Validación | `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform` | Hoy los DTO no se validan. |
| Configuración | `@nestjs/config` con un archivo por ambiente: `.env.development`, `.env.qa` y `.env.production`. Se elige con `NODE_ENV` (`development` por defecto; Jest usa `test` → desarrollo). Las variables del sistema (Railway) tienen prioridad. `.env.example` es la única plantilla versionada. Variables: `DB_*`, `PORT` y más adelante `JWT_SECRET` y `SEED_*_PASSWORD` | No comentar y descomentar credenciales al cambiar de ambiente. **Hecho** (oct-2026). |
| Esquema de BD | Migraciones de TypeORM (`src/database/data-source.ts`, `src/database/migrations/`). `synchronize` sigue en `false` | Hoy los cambios de esquema son manuales. Hay que agregar varias tablas y columnas. |
| Concurrencia (RF-25 y casos límite) | Restricciones `EXCLUDE USING gist` de PostgreSQL (extensión `btree_gist`) sobre `tstzrange(starts_at, ends_at)`, por estilista y por cliente, solo para citas `pendiente`/`en_curso`. También para bloques de agenda por estilista | La base de datos garantiza que no haya dos reservas en el mismo horario, aunque lleguen a la vez. El error `23P01` se traduce a **409 Conflict**. |
| Transiciones de estado | `UPDATE ... WHERE id = :id AND status = :esperado`. Si no afecta filas, se responde 409 | Resuelve la carrera entre la cancelación automática y el inicio de la cita. |
| Cancelación automática (RF-35) | `@nestjs/schedule`, `@Cron` cada minuto | Patrón oficial de NestJS. |
| Zona horaria | Se guarda en `timestamptz`. Toda regla de día y hora se calcula en America/Bogota (UTC-5 fijo, sin horario de verano). La API recibe y devuelve ISO 8601 con offset `-05:00` | No hace falta una librería de zonas horarias. |
| Rutas | Se mantiene la convención actual: `POST /<recurso>/create`, `GET /<recurso>/all`, `GET\|PATCH\|DELETE /<recurso>/:id`. Las acciones de dominio son subrutas (`PATCH /appointments/:id/start`) | Coherencia con `users` y `customers`. |
| Errores | Mensajes en español. Duplicado (`23505`) → 400 con el campo; solapamiento (`23P01`) o transición inválida → 409; sin permiso → 403 | Spec, RNF de idioma. |

### Dependencias nuevas
- `@nestjs/jwt` (peer `@nestjs/common ^11`), `@nestjs/schedule` (peer `^11`), `bcryptjs` (pasa a `dependencies`).
- Scripts nuevos en `package.json`: `typeorm`, `migration:generate`, `migration:run`, `migration:revert` y `seed`.

---

## 2. Estructura de carpetas

```
src/
├── main.ts                          # + ValidationPipe global
├── app.module.ts                    # + ConfigModule, ScheduleModule, TypeORM desde config, módulos nuevos
├── common/
│   ├── enums/role.enum.ts
│   ├── filters/db-exception.filter.ts   # 23505 → 400, 23P01 → 409
│   └── time/bogota.ts                   # helpers de fecha/hora en UTC-5
├── database/
│   ├── data-source.ts               # DataSource para el CLI de migraciones
│   ├── migrations/
│   └── seeds/seed.ts                # datos semilla repetibles (sin duplicar)
├── auth/                            # FASE 2 (reutiliza UsersModule/UsersService)
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts                # JWT + sesión 15 min
│   ├── roles.guard.ts
│   ├── decorators/{public,roles,current-user}.decorator.ts
│   ├── entities/session.entity.ts
│   └── dto/{register,login}.dto.ts
├── users/                           # existente — se revisa en FASE 1 y se amplía en FASE 2
├── customers/                       # existente — se revisa en FASE 1, FASE 3
├── services/                        # FASE 4 (catálogo)
├── stylists/                        # FASE 5
├── availability/                    # FASE 6 (agenda)
└── appointments/                    # FASE 7 (+ appointments.scheduler.ts)
```

Cada módulo sigue el patrón actual: `entities/`, `dto/`, `*.module.ts`, `*.controller.ts`, `*.service.ts` y sus `*.spec.ts`.

---

## 3. Modelo de datos (resultado final)

| Tabla | Columnas clave | Notas |
|---|---|---|
| `users` *(existe)* | + `role` (enum), `failed_login_attempts` int default 0, `is_locked` bool default false | Cuenta y credenciales de **todo** usuario. |
| `sessions` | `id`, `user_id` FK, `last_activity_at`, `revoked_at` null, `created_at` | RF-8, logout. |
| `customers` *(existe)* | + `user_id` FK único (1:1). Se mantienen `document` (único), `name`, `lastName`, `email`, `phone`, `is_active` | Perfil del cliente. `email` se sincroniza con `users.email`. |
| `services` | `id`, `name` único, `description`, `duration_minutes` **null**, `price` numeric(10,2) **null**, `image_url`, `is_active` | Duración `null` → se usan 60 min (RF-20). |
| `stylists` | `id`, `user_id` FK único, `display_name`, `photo_url`, `is_active` | La administradora también tiene un registro de estilista. |
| `stylist_services` | `stylist_id`, `service_id` (PK compuesta) | ManyToMany. |
| `availability_blocks` | `id`, `stylist_id`, `starts_at`, `ends_at`, `change_note` null, `deleted_at` null, timestamps | `CHECK (ends_at > starts_at)` y `EXCLUDE` por estilista entre bloques no eliminados. El borrado es lógico para conservar la nota (RF-16). |
| `appointments` | `id`, `customer_id`, `stylist_id`, `service_id`, `starts_at`, `ends_at`, `status` (enum), `needs_reschedule` bool, `cancelled_by` (enum, null), `cancel_reason` null, `price_at_booking` null, timestamps | `EXCLUDE` por estilista y por cliente cuando `status IN ('pendiente','en_curso')`. |

Enums: `appointment_status` = `pendiente | en_curso | cerrada | cancelada`; `cancelled_by` = `cliente | estilista | sistema`.

---

## 4. Fases

### Flujo de trabajo
- **Una rama por fase**, creada desde `main` actualizado (`fase-0-base`, `fase-1-revision`, `fase-2-auth`, …).
- **Cierre de cada fase:** `pnpm test`, `pnpm lint` y `pnpm build` en verde → commit con mensaje convencional en español →
  **la usuaria revisa el diff y da el visto bueno** → `git push -u origin <rama>` → Pull Request hacia `main` → la usuaria
  hace el merge → `git checkout main && git pull`. No hay push directo a `main` ni push sin visto bueno.
  `gh` no está instalado: el PR se abre desde el enlace que imprime el push.
- **Base de datos:** las consultas de solo lectura están permitidas sin preguntar, solo en desarrollo (script de Node con
  `pg` y `.env.development`). Toda escritura (migraciones, seed, DML/DDL, e2e o k6 que escriben) se pide antes.
  QA y producción no se tocan nunca.

### Fase 0 — Base común
**Cambios**
- ✅ `ConfigModule` con un `.env` por ambiente y validación de las variables obligatorias al arrancar; TypeORM con `forRootAsync`. Ya no hay credenciales en `app.module.ts`.
- `ValidationPipe` global en `main.ts`; `db-exception.filter.ts` global.
- `data-source.ts` y los scripts de migración. Primera migración **baseline**: refleja `users` y `customers` tal como existen hoy. Antes de generarla hay que comparar el esquema real de la BD local con las entidades.
- ✅ `bcryptjs` en `dependencies` (la limpieza pendiente pasa a la Fase 1).
- Versionar los archivos que aún no están en git (`CLAUDE.md`, `README.md`, `docs/`, `specs/`, `railway.yml`, `volume-tests/`).

**Hecho cuando:** `pnpm build`, `pnpm lint` y `pnpm test` pasan en verde, la app arranca leyendo el `.env` y `migration:run` funciona sobre una BD vacía.

### Fase 1 — Revisión del código existente
Antes de construir encima, se revisan `users`, `customers`, `app.module.ts`, `main.ts` y `app.controller.ts`, y se
optimiza **sin cambiar el comportamiento**. Los hallazgos quedan en la descripción del PR.
- Limpiar `pnpm-workspace.yaml` (quitar `bcrypt`), quitar `@types/bcryptjs` y el `@ts-ignore` de `users.service.ts`.
- Arreglar `users.*.spec.ts` (mock con `getRepositoryToken(User)`, como en `customers`).
- Renombrar los DTO de customers a `create-customer.dto.ts` / `update-customer.dto.ts`; `ParseUUIDPipe` en `customers/:id`.
- Validaciones de class-validator completas en los DTO existentes, ahora que hay `ValidationPipe` global.
- Unificar errores: `23505` va al filtro global, sin búsquedas repetidas, con mensajes en español.
- `users` **se mantiene**: su entidad sigue siendo la tabla `users`. Se prepara para Auth exportando `UsersService` y
  agregando `findByEmail`, que incluye la contraseña para el login.

### Fase 2 — Auth (RF-1 a RF-9)
No se crea otro módulo de usuarios: `AuthModule` importa `UsersModule` y usa `UsersService`.

**Migración:** columnas nuevas en `users` (en la entidad `User` existente) y tabla `sessions`.

**Endpoints**
| Método y ruta | Acceso | RF |
|---|---|---|
| `POST /auth/register` | público | RF-1, RF-2: crea `user` (role `customer`) + `customer` en **una transacción** |
| `POST /auth/login` | público | RF-3, RF-4, RF-5: devuelve `{ accessToken, role }` |
| `POST /auth/logout` | autenticado | revoca la sesión |
| `GET /auth/me` | autenticado | perfil del usuario (sin contraseña) |
| `PATCH /auth/users/:id/unlock` | admin | RF-6: `is_locked=false`, `failed_login_attempts=0` |
| `PATCH /auth/users/:id/password` | admin | restablecer contraseña (sustituye la recuperación por correo, fuera de alcance) |

**Reglas**
- Login: si el usuario no existe o la contraseña es incorrecta → 401 con el mensaje genérico. Si la contraseña es incorrecta, se incrementa el contador; al llegar a 3, se bloquea la cuenta. Si la cuenta está bloqueada → 403 "cuenta bloqueada", aunque la contraseña sea correcta. Un login exitoso reinicia el contador.
- Payload del JWT: `{ sub: userId, role, sid }`. `AuthGuard`: verifica el token, carga la sesión, comprueba que no esté revocada y que `now - last_activity_at <= 15 min` (si no, 401) y actualiza `last_activity_at`.
- `RolesGuard`: si la ruta no declara `@Roles()`, basta con estar autenticado. `admin` no hereda permisos de cliente.
- El `UsersController` actual deja de ser público: `POST /users/create` y el resto de rutas pasan a ser solo para `admin`. El registro de clientes pasa por `/auth/register`.

**Tests:** unitarios de `AuthService` (registro duplicado, contador y bloqueo, desbloqueo, hash), de los guards (`@Public`, roles, sesión expirada con reloj simulado), y e2e de registro → login → `/auth/me` → logout.

### Fase 3 — Customers (RF-22, RF-24, RF-31)
- Se agrega la relación `customer.user` (1:1).
- `GET /customers/me` y `PATCH /customers/me` (cliente): leer y actualizar su perfil. Sirve para precargar y actualizar nombre, apellidos y celular al reservar.
- Las rutas CRUD existentes (`/customers/create`, `/all`, `/:id`) quedan solo para `admin`.
- Se conserva el nombre de propiedad `isActivate` y el borrado lógico.

**Tests:** los specs existentes adaptados, más "un cliente solo ve y edita su propio perfil".

### Fase 4 — Services, el catálogo (RF-10)
- Entidad `Service` y migración.
- `GET /services/all` (público, solo servicios activos) y `GET /services/:id` (público).
- No hay endpoints de escritura: la administración de servicios está fuera de alcance, y los datos llegan por *seed*.
- `duration_minutes` y `price` se devuelven como `null` cuando no están definidos.

**Tests:** el listado filtra los servicios inactivos y devuelve los `null` sin romper la respuesta.

### Fase 5 — Stylists (RF-11, RF-12)
- Entidades `Stylist` y `stylist_services`, y migración.
- `GET /stylists/all?serviceId=` (público): estilistas activos que prestan ese servicio.
- `GET /stylists/me` (stylist/admin): su propio registro de estilista.

**Tests:** el filtro por servicio excluye a los estilistas inactivos.

### Fase 6 — Availability, la agenda (RF-13 a RF-19)
- Entidad `AvailabilityBlock` y migración (con `btree_gist`, `CHECK` y `EXCLUDE`).
- Endpoints (stylist/admin, **solo sobre la agenda propia**; el estilista se resuelve desde el token):
  - `POST /availability/create`: recibe uno o varios bloques en una transacción (semana, quincena o mes). Rechaza bloques pasados (RF-15) y solapados (RF-14, 409).
  - `PATCH /availability/:id`, con `note` obligatoria (RF-16).
  - `DELETE /availability/:id`, con `note` obligatoria y borrado lógico.
  - `GET /availability/me?from=&to=`.
- `GET /availability/stylist/:stylistId?from=&to=`: solo `admin`, de lectura (RF-19).
- **RF-17:** al editar o eliminar un bloque, en la misma transacción se marcan con `needs_reschedule = true` las citas `pendiente` del estilista que queden fuera de cualquier bloque vigente, y se devuelven en la respuesta.
- Bloqueo de concurrencia: editar un bloque y reservar hacen `SELECT ... FOR UPDATE` sobre la fila del estilista, para que una reserva no caiga en un bloque que se está recortando.

**Tests:** solapamiento, bloques pasados, nota obligatoria, citas marcadas para reagendar, y que el admin no pueda editar agendas ajenas.

### Fase 7 — Appointments: reserva, gestión y estados (RF-20 a RF-36)
**Consulta de horarios (RF-20, RF-21)**
- `GET /appointments/slots?stylistId=&serviceId=&from=&to=` (cliente). Ventana por defecto: los próximos 30 días. Se ofrecen horarios de inicio en pasos de **30 min** (constante `SLOT_STEP_MINUTES`) donde `[inicio, inicio + duración)` cabe en un bloque y no choca con citas `pendiente`/`en_curso` del estilista. Duración = `duration_minutes ?? 60`.
- Si no hay horarios en la ventana, se responde `{ slots: [], alternativeStylists: [...] }` con los demás estilistas que prestan el servicio.

**Reserva (RF-23 a RF-26)**
- `POST /appointments/create` (cliente) con `{ stylistId, serviceId, startsAt, name?, lastName?, phone? }`. En una transacción:
  1. Bloquea la fila del estilista.
  2. Valida que el horario cae dentro de un bloque, que es futuro y que el estilista y el servicio están activos y relacionados.
  3. Si cambiaron los datos personales, actualiza el perfil del cliente (RF-24).
  4. Inserta la cita en estado `pendiente` con `price_at_booking`.

  Un `23P01` se responde con 409 "el horario ya fue tomado" (RF-25). RF-26 no requiere backend: no se llama al endpoint.

**Gestión del cliente (RF-27 a RF-31)**
- `GET /appointments/me?status=`.
- `PATCH /appointments/:id/reschedule` permite el cambio solo si faltan **≥ 24 h** según el `starts_at` actual (RF-28). Si faltan menos, responde 409 indicando que debe cancelar y reservar de nuevo (RF-28a). El cambio revalida el horario como una reserva nueva, en la misma transacción.
- `PATCH /appointments/:id/cancel` permite la cancelación solo si la cita está `pendiente` y faltan **≥ 15 min** (RF-29 y RF-29a). Si está en curso, cerrada o cancelada → 409 (RF-30 y RF-35a).
- Cada endpoint comprueba que la cita pertenece al cliente del token (RF-31). Si no, responde 404 para no revelar que existe.

**Personal (RF-18, RF-33, RF-34, RF-36)**
- `GET /appointments/calendar?from=&to=&stylistId=&serviceId=` (stylist: solo sus citas; admin: todas). Con lista vacía, la respuesta incluye un mensaje de disponibilidad.
- `PATCH /appointments/:id/start`: `pendiente → en_curso`, permitido hasta `starts_at + 10 min` inclusive.
- `PATCH /appointments/:id/close`: `en_curso → cerrada`.
- `PATCH /appointments/:id/no-show`: `pendiente → cancelada` (`cancelled_by = estilista`, `cancel_reason = no_asistio`).
- El estilista solo puede actuar sobre sus propias citas.

**Cancelación automática (RF-35)**
- `appointments.scheduler.ts`: `@Cron` cada minuto, con un solo `UPDATE` que cancela las citas en estado `pendiente` cuya `starts_at + interval '10 minutes' < now()` (`cancelled_by = sistema`, `cancel_reason = no_asistio`). Nunca toca las citas `en_curso`.

**Tests:** cálculo de horarios (bordes de bloque, duración `null`, citas contiguas), límites de 24 h, 15 min y 10 min (inclusivos), transiciones inválidas, pertenencia de la cita, el scheduler con reloj simulado, y un e2e de concurrencia: dos reservas simultáneas del mismo horario donde exactamente una responde 201 y la otra 409.

### Fase 8 — Datos semilla
- `pnpm seed` ejecuta `src/database/seeds/seed.ts`. Es **idempotente**: hace *upsert* por `users.email`, `services.name` y la PK de `stylist_services`.
- Servicios: corte de cabello, cepillado, alisado, manicura y pedicura (duración y precio en `null`).
- Empleados, cada uno con `user` + `stylist`:
  - Marys Angelica (`admin`): corte, cepillado, alisado.
  - Olga Osorio (`stylist`): corte, cepillado, alisado, manicura, pedicura.
  - Patricia Rodas (`stylist`): manicura, pedicura.
- Las contraseñas iniciales salen del `.env` (`SEED_*_PASSWORD`), nunca del código.
- Correos **ficticios** y distintos entre sí: `marys@salon.local`, `olga@salon.local`, `patricia@salon.local`.

### Fase 9 — Cierre
- E2E del flujo principal: registro → login → catálogo → estilista → horario → reservar → el estilista inicia → cierra.
- Script k6 `volume-tests/appointments.load.js` (consulta de horarios + reserva), con los mismos umbrales que `customers.load.js`.
- Actualizar `CLAUDE.md`: módulo `auth`, rutas privadas por defecto con `@Public()`, migraciones, *seed* y comandos nuevos.

---

## 5. Trazabilidad RF → fase

| Fase | RF |
|---|---|
| 1 Revisión | — (calidad del código existente) |
| 2 Auth | RF-1 a RF-9 |
| 3 Customers | RF-22, RF-24, RF-31 (perfil) |
| 4 Services | RF-10 |
| 5 Stylists | RF-11, RF-12 |
| 6 Availability | RF-13 a RF-19 |
| 7 Appointments | RF-20, RF-21, RF-23, RF-25 a RF-36 (incl. 28a, 29a, 35a) |
| 9 Cierre | criterios de finalización de la spec |

---

## 6. Pendientes antes o durante la implementación
- **Esquema real de la BD local:** antes de la migración baseline (Fase 0) hay que confirmar que las tablas `users` y `customers` coinciden con las entidades.
- **Credenciales de Railway:** ya están en `.env.production` (fuera de git). Falta crear las mismas variables en el panel de Railway (*Variables*) y comprobar que `NODE_ENV=production` esté definido allí. Conviene cambiar esa contraseña, porque estuvo escrita en el código.
- **`.env.qa`:** tiene los campos vacíos hasta que exista la base de datos de QA.
- ✅ **BD local:** la conexión con `.env.development` funciona (verificado el 2026-10-06: PostgreSQL 17.9, BD `salon_belleza`, usuario `postgres`).
- **Decisiones del plan que la spec no fija** (fáciles de cambiar): horarios de inicio cada 30 min, ventana de 30 días para buscar disponibilidad e inicio de cita permitido antes de la hora agendada.
