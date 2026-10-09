# Spec 001 — MVP de citas en línea del salón de belleza

## Contexto y objetivo
Hoy las citas del salón se gestionan de forma manual, sin control preciso de tiempos, clientes ni días de mayor
afluencia. Este MVP digitaliza el flujo central: el cliente reserva una cita eligiendo servicio, estilista, fecha y hora
según la agenda real del personal, y el personal gestiona esa agenda y el estado de las citas. Con esto el salón
evita conflictos de horario y empieza a acumular un histórico de citas (realizadas, canceladas, servicios más pedidos)
para analizar la demanda.

Fuentes: `docs/formulacion_del_proyecto_de_software.pdf` (HU-001 a HU-005), `docs/requerimientos_funcionales_no_funcionales.pdf`
(SB V1 01–12), `docs/plantilla_formato_ieee830_Natalia_Villa.pdf`, `docs/Casos_de_uso.pdf`, `docs/Mapa_de_procesos_Natalia_Villa.pdf`.

## Usuarios / actores
- **Cliente**: se registra, inicia sesión, reserva, modifica y cancela sus citas, y consulta su histórico.
- **Estilista / Manicurista**: carga y edita su propia agenda de disponibilidad, revisa sus citas, las inicia, las cierra o las cancela.
- **Administrador** (estilista principal): gestiona su propia agenda como estilista, consulta (sin editar) las agendas y citas de todo el personal y desbloquea cuentas.
- **Sistema** (automático): cancela las citas cuyo servicio no se inició a tiempo.

## Historias de usuario
- H1 (HU-001): Como usuario quiero iniciar sesión con mi correo y contraseña para acceder a las funciones de mi rol.
- H2 (HU-001): Como cliente nuevo quiero registrarme para poder reservar citas.
- H3 (HU-002): Como cliente quiero ver los servicios que ofrece el salón para elegir el que me voy a realizar.
- H4 (HU-003): Como cliente quiero elegir al estilista que me atenderá y ver sus días y horas disponibles para reservar en el horario que me acomode.
- H5 (HU-003): Como cliente quiero que mi nombre, apellidos y celular aparezcan precargados al confirmar la reserva para no escribirlos cada vez.
- H6 (HU-004): Como cliente quiero ver mis citas pendientes e históricas, y modificarlas o cancelarlas cuando lo necesite.
- H7 (HU-005): Como estilista quiero cargar y editar mi agenda de disponibilidad para que los clientes reserven solo cuando puedo atender.
- H8 (HU-005): Como estilista quiero ver mis citas del día y de la semana y marcarlas como en curso, finalizadas o canceladas para llevar el control de mis servicios.
- H9: Como administradora quiero ver el calendario de citas de todo el personal, filtrado por fecha, estilista o servicio, para organizar el salón.

## Requisitos funcionales (criterios de aceptación en EARS)

### Autenticación y roles (HU-001, SB V1 06, SB V1 07)
- RF-1: CUANDO un visitante envía nombre, apellidos, email, celular, documento de identidad y contraseña válidos, EL SISTEMA crea una cuenta con rol *cliente* y responde con los datos del usuario, sin la contraseña. Todos los campos son obligatorios.
- RF-2: SI el correo o el documento ya están registrados, ENTONCES EL SISTEMA rechaza el registro con un mensaje que indica el dato duplicado.
- RF-3: CUANDO un usuario envía credenciales correctas, EL SISTEMA inicia la sesión y devuelve un token de acceso junto con su rol.
- RF-4: SI las credenciales son incorrectas, ENTONCES EL SISTEMA responde con un mensaje genérico ("usuario o contraseña incorrectos"), sin revelar cuál de los dos datos falló.
- RF-5: SI un usuario acumula 3 intentos fallidos seguidos, ENTONCES EL SISTEMA bloquea la cuenta y rechaza nuevos intentos con un mensaje de cuenta bloqueada.
- RF-6: MIENTRAS una cuenta esté bloqueada, EL SISTEMA rechaza todo inicio de sesión, aun con la contraseña correcta, hasta que un administrador la desbloquee; al desbloquearla, EL SISTEMA reinicia su contador de intentos fallidos. No hay desbloqueo por tiempo.
- RF-7: EL SISTEMA solo permite a cada rol las operaciones que le corresponden y rechaza el resto con un error de permisos (403).
- RF-8: SI una sesión lleva 15 minutos sin actividad, ENTONCES EL SISTEMA la invalida y exige iniciar sesión de nuevo.
- RF-9: EL SISTEMA almacena las contraseñas solo como hash y nunca las devuelve en ninguna respuesta.

### Catálogo de servicios y estilistas (HU-002, HU-003, SB V1 02, SB V1 03)
- RF-10: CUANDO un cliente consulta el catálogo, EL SISTEMA devuelve los servicios activos con nombre, descripción, duración, precio e imagen. Duración y precio pueden ser `null` mientras no estén definidos, y en ese caso se devuelven como `null`.
- RF-11: CUANDO un cliente elige un servicio, EL SISTEMA devuelve solo los estilistas activos que prestan ese servicio.
- RF-12: SI un estilista está inactivo (vacaciones o retiro), ENTONCES EL SISTEMA no lo muestra a los clientes ni permite reservarle citas.

### Agenda del estilista (HU-005, SB V1 01)
- RF-13: CUANDO un estilista guarda bloques de su propia agenda de disponibilidad (fecha, hora de inicio, hora de fin) para una semana, quincena o mes, EL SISTEMA los registra y los deja disponibles de inmediato para reservas.
- RF-14: SI un bloque nuevo se superpone con otro bloque del mismo estilista, o su hora de fin no es posterior a la de inicio, ENTONCES EL SISTEMA lo rechaza indicando el conflicto.
- RF-15: SI un bloque cae en una fecha u hora pasada, ENTONCES EL SISTEMA lo rechaza.
- RF-16: CUANDO un estilista edita o elimina un bloque, EL SISTEMA aplica el cambio y deja una nota obligatoria con el motivo de la novedad.
- RF-17: SI la edición o eliminación de un bloque deja fuera citas ya agendadas, ENTONCES EL SISTEMA no las borra: las marca como *requiere reagendar* y las lista al estilista.
- RF-18: CUANDO un estilista consulta su agenda, EL SISTEMA devuelve sus citas del día o de la semana con cliente, servicio, hora y estado.
- RF-19: EL SISTEMA permite a cada estilista crear, editar y eliminar solo los bloques de su propia agenda; el administrador puede consultar la agenda de cualquier estilista, pero no modificarla.

### Reserva de citas (HU-003, SB V1 04, SB V1 10, caso de uso "Reservar una cita")
- RF-20: CUANDO un cliente elige un estilista y un servicio, EL SISTEMA devuelve los días con disponibilidad y, para cada día, los horarios de inicio en los que cabe la duración completa del servicio sin chocar con otras citas. SI el servicio no tiene duración definida, ENTONCES EL SISTEMA usa una duración por defecto de 60 minutos.
- RF-21: SI el estilista elegido no tiene disponibilidad próxima, ENTONCES EL SISTEMA lo informa y sugiere los demás estilistas que prestan ese servicio.
- RF-22: CUANDO un cliente inicia la confirmación de una reserva, EL SISTEMA devuelve su nombre, apellidos y celular guardados para precargar el formulario.
- RF-23: CUANDO un cliente confirma la reserva, EL SISTEMA crea la cita en estado *pendiente* y devuelve su resumen (servicio, estilista, fecha, hora, duración y precio; los dos últimos pueden ser `null`).
- RF-24: SI el cliente cambia su nombre, apellidos o celular al confirmar, ENTONCES EL SISTEMA actualiza esos datos en su perfil.
- RF-25: SI el horario ya fue tomado por otra reserva al momento de confirmar, ENTONCES EL SISTEMA rechaza la reserva sin crear la cita y pide elegir otro horario.
- RF-26: SI el cliente cancela antes de confirmar, ENTONCES EL SISTEMA no guarda nada.

### Gestión de citas del cliente (HU-004)
- RF-27: CUANDO un cliente consulta sus citas, EL SISTEMA devuelve las pendientes y el histórico, con opción de filtrar por estado.
- RF-28: CUANDO un cliente modifica la fecha u hora de una cita pendiente con al menos 24 horas de antelación a su hora de inicio, EL SISTEMA valida la nueva disponibilidad, mueve la cita y libera el horario anterior.
- RF-28a: SI el cliente intenta modificar una cita pendiente cuando faltan menos de 24 horas para su hora de inicio, ENTONCES EL SISTEMA rechaza el cambio e indica que debe cancelar la cita (si aún está dentro del plazo de RF-29) y reservar una nueva.
- RF-29: CUANDO un cliente cancela una cita pendiente con al menos 15 minutos de antelación a su hora de inicio, EL SISTEMA la pasa a estado *cancelada* y libera el horario.
- RF-29a: SI el cliente intenta cancelar una cita pendiente cuando faltan menos de 15 minutos para su hora de inicio, ENTONCES EL SISTEMA lo rechaza con un mensaje que indica que el plazo de cancelación venció.
- RF-30: SI el cliente intenta modificar o cancelar una cita *en curso*, pasada, *cerrada* o *cancelada*, ENTONCES EL SISTEMA lo rechaza con un mensaje de error.
- RF-31: EL SISTEMA solo permite a un cliente ver y gestionar sus propias citas.

### Estados y cierre de citas (HU-004 esc. 3, HU-005, caso de uso "Consultar calendario")
- RF-32: EL SISTEMA maneja cuatro estados de cita: *pendiente*, *en curso* (el cliente llegó y el servicio empezó), *cerrada* (servicio realizado) y *cancelada*. Solo se permiten estas transiciones: *pendiente → en curso*, *pendiente → cancelada*, *en curso → cerrada*. Las citas canceladas guardan quién canceló (cliente, estilista o sistema) y el motivo.
- RF-33: CUANDO el estilista inicia una cita *pendiente*, EL SISTEMA la pasa a *en curso*; CUANDO el estilista marca una cita *en curso* como realizada, EL SISTEMA la pasa a *cerrada*.
- RF-34: CUANDO el estilista cancela una cita *pendiente* porque el cliente no llegó, EL SISTEMA la pasa a *cancelada* con motivo *no asistió*.
- RF-35: MIENTRAS una cita siga *pendiente* 10 minutos después de su hora de inicio (el estilista no la marcó *en curso* a la hora exacta ni dentro de esa tolerancia), EL SISTEMA la cancela automáticamente con motivo *no asistió*.
- RF-35a: SI alguien (cliente, estilista o el proceso automático) intenta cancelar una cita *en curso*, ENTONCES EL SISTEMA lo rechaza, porque se asume que el cliente llegó.
- RF-36: CUANDO el personal consulta el calendario, EL SISTEMA permite filtrar por fecha, estilista y servicio, y muestra un mensaje de disponibilidad si no hay citas en el rango.

## Requisitos no funcionales
- **Seguridad**: contraseñas con hash (bcrypt); autenticación por token; expiración por inactividad de 15 min (SB V1 07); autorización por rol en cada endpoint.
- **Rendimiento**: p95 < 500 ms y menos del 1 % de errores con 20 usuarios concurrentes en los endpoints de reserva y consulta (mismo umbral de `volume-tests/`).
- **Plataforma**: API REST (NestJS + PostgreSQL) consumible desde un frontend responsive (SB V1 11). El frontend no forma parte de esta spec.
- **Escalabilidad**: servicios, estilistas y la relación entre ellos son datos, no código, para poder sumar servicios o sedes sin cambios de esquema (SB V1 09).
- **Idioma**: mensajes de error y validación en español.
- **Zona horaria**: todas las fechas y horas de agenda y citas se interpretan en America/Bogota.
- **Datos**: se reutilizan las tablas existentes. `users` guarda las credenciales y la cuenta de todo usuario (se le agregan rol, contador de intentos fallidos y bloqueo) y `customers` guarda el perfil del cliente (documento, nombre, apellidos, email, celular), vinculado 1:1 a su `user`. El esquema se modifica manualmente o con migraciones, porque `synchronize` está desactivado.
- **Imágenes**: los servicios y estilistas se referencian por URL; el formato liviano (SB V1 12) es responsabilidad de quien sube la imagen.

## Casos límite
- Dos clientes confirman el mismo horario del mismo estilista a la vez: solo una reserva tiene éxito (control a nivel de base de datos, no solo en la aplicación).
- Un servicio cuya duración excede el final del bloque de disponibilidad: ese horario no se ofrece.
- Una cita que empieza exactamente cuando termina otra: se permite (los intervalos son semiabiertos `[inicio, fin)`).
- Un cliente con dos citas superpuestas con distintos estilistas: se rechaza la segunda.
- Un estilista inactivado con citas pendientes: las citas quedan *requiere reagendar* y no se cancelan en silencio.
- Un servicio desactivado con citas pendientes: las citas existentes se mantienen y no se aceptan reservas nuevas.
- Campos vacíos, correo inválido, fechas mal formadas o IDs que no son UUID: se rechazan con 400.
- Cambio de día o de mes y horas cercanas a la medianoche: todas las horas se calculan en America/Bogota.
- Un usuario bloqueado que intenta iniciar sesión con la contraseña correcta: sigue bloqueado.
- Un cliente modifica una cita exactamente 24 horas antes de su inicio: se permite (límite inclusivo). La antelación se mide contra la hora de inicio actual de la cita, no contra la nueva.
- Un cliente cancela exactamente 15 minutos antes de la hora de inicio: se permite (el límite es inclusivo); a los 14 min 59 s se rechaza.
- El estilista marca la cita *en curso* exactamente a los 10 minutos de la hora de inicio: se permite; pasado ese instante la cita ya puede haber sido cancelada automáticamente.
- La cancelación automática (RF-35) y el inicio de la cita por el estilista en el mismo instante: gana la primera transición, y la segunda falla sin dejar la cita en un estado inconsistente.
- Una cita *en curso* que el estilista olvida cerrar: no se cancela nunca y queda visible como *en curso* en su agenda hasta que la cierre.

## Fuera de alcance
- Notificaciones y recordatorios por SMS o correo (SB V1 05, caso de uso "Enviar notificaciones"): confirmación, recordatorio de 24 h, aviso de cambios de agenda y de cancelación automática.
- Lista de espera cuando el estilista no tiene agenda (HU-003 esc. 5), porque depende de las notificaciones.
- Recuperación de contraseña por correo (HU-001 esc. 4), porque requiere envío de correos. En el MVP, el administrador desbloquea cuentas y restablece contraseñas.
- Administración de servicios, precios, estilistas y empleados desde la aplicación. En el MVP, el equipo de aplicaciones (el equipo de desarrollo) carga con datos semilla (*seed*) los servicios, los empleados (estilistas, manicuristas y la administradora, con sus cuentas y roles) y la relación estilista–servicio, como indica el mapa de procesos. El registro público (RF-1) solo crea clientes.
- Venta y separación de productos, rol Proveedor (proceso alterno del mapa de procesos).
- Pasarela de pagos.
- Reportes y analítica del histórico (el MVP solo guarda los datos que los harán posibles).
- Autenticación de doble factor.
- Frontend.

## Criterios de finalización
- Cada RF tiene al menos un test unitario o e2e en verde (`pnpm test` y `pnpm test:e2e`).
- Existe un test e2e del flujo principal: registro → login → catálogo → estilista → horario → confirmar → el estilista inicia la cita (*en curso*) → la cierra.
- Existe un test de concurrencia que demuestra RF-25 (doble reserva del mismo horario).
- `pnpm lint` y `pnpm build` terminan sin errores.
- Existe un script k6 de reserva/consulta que cumple los umbrales de rendimiento.
- Hay un script de datos semilla, repetible sin duplicar registros, que carga los servicios, las cuentas de los empleados con su rol (incluida la administradora) y la relación estilista–servicio, según el IEEE 830:
  - Marys Angelica (administradora / estilista principal): corte de cabello, cepillado, alisado.
  - Olga Osorio (estilista): corte de cabello, cepillado, alisado, manicura, pedicura.
  - Patricia Rodas (manicurista): manicura, pedicura.
  - Servicios con duración y precio en `null`.
- Demo manual del flujo principal con los tres roles.

## Dudas abiertas
- [PENDIENTE DE DATOS] Duración y precio reales de cada servicio: se cargan en `null` y se completarán cuando se actualicen los docs (mientras tanto rige la duración por defecto de 60 min de RF-20).
