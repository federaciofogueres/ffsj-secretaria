# Features pendientes

Este documento resume lo que queda pendiente por hacer en `ffsj-secretaria`, `ffsj-secretaria-api`, `ffsj-new-censo-api` y la libreria compartida.

El orden esta pensado como orden recomendado de implementacion: primero base tecnica, datos y contratos; despues permisos; despues modulos funcionales; finalmente UX, textos y despliegue.

## 1. ffsj-secretaria-api: base tecnica, BD y migraciones

Estado actual: completado para el alcance actual.

- Proyecto creado.
- Conexion MySQL.
- BD final: `u438573835_secretaria`.
- Implementados endpoints base para registro pendiente y solicitudes.
- Migracion versionada `001_base_secretaria.sql` creada.
- Runner de migraciones `scripts/migrate.js` creado.
- Scripts `db:migrate:local`, `db:migrate:test` y `db:migrate:prod` creados.
- El comando antiguo `db:migrate:registro-pendiente:*` sigue funcionando y delega en el nuevo runner.
- Migracion local ejecutada correctamente sobre `u438573835_secretaria`.
- El migrador normaliza tablas existentes con esquema anterior sin borrar columnas antiguas.
- Persistencia real consolidada para los endpoints actuales:
  - registro pendiente,
  - solicitudes,
  - registros documentales,
  - formularios/entradas de inscripcion,
  - incidencias,
  - actividades,
  - resumen de cargos,
  - justificantes.
- Datos semilla minimos para actividades, formularios y cargos cuando las tablas estan vacias.
- Validaciones basicas de ids, enums y payloads JSON.
- Respuestas de error normalizadas con `status`, `message` y `details`.

Fuera de este punto:

- El middleware de permisos se implementara mas adelante dentro del modulo de permisos y roles.
- Las nuevas migraciones incrementales se crearan cuando haya nuevos cambios de esquema.
- Las validaciones especificas de negocio se ampliaran dentro de cada funcionalidad concreta cuando se definan sus reglas finales.

## 2. OpenAPI y clientes

Estado actual: completado para el alcance actual.

- `ffsj-new-censo-api` tiene OpenAPI actualizado parcialmente.
- `ffsj-secretaria-api` tiene OpenAPI sincronizado con los endpoints actuales.
- Se han documentado schemas de request/response para:
  - login/contexto provisional,
  - registro pendiente,
  - solicitudes,
  - registros documentales,
  - inscripciones,
  - actividades,
  - cargos,
  - incidencias,
  - justificantes.
- Se ha creado `npm run openapi:check` para validar que el YAML carga correctamente.
- `npm run openapi:check` ejecutado correctamente.

Fuera de este punto:

- Mantener OpenAPI sincronizado con cada endpoint nuevo que se implemente.
- Generar cliente tipado solo si se decide usarlo en el front.
- Anadir al contrato los endpoints nuevos cuando se implementen envio/validacion, adjuntos reales y permisos.

## 3. Password de asociaciones

Estado actual: completado.

- Detectado que `asociaciones.password` estaba en `varchar(45)` y truncaba hashes bcrypt.
- Columna ampliada a `varchar(250)` para guardar el hash completo.
- El login por asociacion funciona correctamente con la columna ampliada.
- Hay script para ampliar la columna y detectar hashes incompletos.

Nota operativa:

- Las contrasenas definitivas se actualizaran desde la BD antigua cuando el desarrollo este completado.
- No requiere mas trabajo ahora mismo.

## 4. Login administrativo

Estado actual: completado.

- Nueva ruta `/admin` creada en `ffsj-secretaria`.
- La ruta usa el login original de personas (`lib-ffsj-login`).
- El acceso administrativo se valida por cargo admin `idCargo = 16`.
- Si el usuario no tiene ese cargo, no accede a la pantalla de administracion.
- La pantalla `/admin` separa dos configuraciones:
  - permisos base del acceso Asociaciones,
  - permisos por cargo del acceso Administracion.
- Los endpoints admin de `ffsj-secretaria-api` estan protegidos por token Bearer y cargo admin.
- Tests anadidos para validar la deteccion del cargo admin.

## 5. Permisos por tipo de acceso

Estado actual: completado para el alcance actual.

- El token de asociacion incluye `idAsociacion`.
- Los permisos son fijos del sistema y se crean por migracion.
- Acceso Asociaciones:
  - entra con CIF y contrasena de asociacion,
  - no identifica a una persona concreta,
  - usa permisos base comunes configurables desde `/admin`.
- Acceso Administracion:
  - entra con login de persona,
  - identifica cargos desde el token,
  - usa permisos por cargo del censo.
- Migracion `002_roles_permisos.sql` creada y ejecutada en local.
- Migracion `003_cargo_permisos.sql` creada y ejecutada en local.
- Migracion `004_asociacion_base_permisos.sql` creada y ejecutada en local.
- Permisos minimos definidos:
  - asociacion:read,
  - asociacion:write,
  - asociados:read,
  - solicitudes:read,
  - solicitudes:write,
  - solicitudes:send,
  - solicitudes:validate,
  - inscripciones:read,
  - inscripciones:write,
  - registro:read,
  - registro:write,
  - incidencias:read,
  - incidencias:write.
- Menu filtrado por permisos.
- Rutas protegidas con guard de permisos.
- Acciones principales protegidas en componente:
  - edicion de asociacion,
  - creacion de registros pendientes y solicitudes,
  - envio de inscripciones,
  - registro documental y comunicaciones.
- Endpoints funcionales de `ffsj-secretaria-api` protegidos con permisos por token Bearer.
- Endpoints admin para:
  - listar permisos,
  - listar/actualizar permisos base del acceso Asociaciones,
  - listar permisos asignados a cargos,
  - asignar permisos a cargos del censo.
- Tests anadidos para guard de permisos y acceso admin.

Fuera de este punto:

- Afinar permisos por cargo cuando secretaria defina la matriz definitiva.
- Aplicar permisos a futuras funcionalidades nuevas conforme se implementen.

## 6. Login por asociacion y sesion

Estado actual:

- Existe `POST /login/asociacion` en `ffsj-new-censo-api`.
- El login devuelve token con `idAsociacion`.
- `ffsj-secretaria` usa el login por asociacion de `ffsj-web-components`.
- El componente de login redirige al panel principal cuando `ffsj-web-components` emite login correcto.
- Los permisos base de asociacion se cargan desde `ffsj-secretaria-api/contexto` usando el token bearer y el `idAsociacion` del token.
- Las llamadas a `ffsj-secretaria-api` y `ffsj-new-censo-api` reutilizan el token de sesion.
- Hay tests de redireccion de login y carga de contexto de sesion por asociacion.

Pendiente operativo:

- Desplegar/reiniciar `ffsj-new-censo-api` en cada entorno con el endpoint nuevo.
- Confirmar expiracion y logout en todos los entornos desplegados.
- Revisar mensajes de error del login para diferenciar credenciales invalidas, password truncada y asociacion sin password cuando se quiera afinar UX.

## 7. Asociacion

Estado actual: completado para el alcance actual.

- La pantalla carga la asociacion activa desde `ffsj-new-censo-api`.
- El boton guardar hace `PUT /asociaciones/{id}`.
- Se envia `active` como boolean para cumplir OpenAPI.
- Se envian solo columnas reales de la tabla de censo.
- La pantalla separa visualmente `direccion`, `codigo postal` y `localidad` cuando censo devuelve una direccion compuesta.
- `ffsj-new-censo-api` tiene OpenAPI actualizado con las columnas ampliadas de `asociaciones`:
  - localidad,
  - codigo_postal,
  - provincia,
  - himno,
  - ubicacion_monumento,
  - ubicacion_portada,
  - sede_direccion,
  - sede_codigo_postal,
  - sede_poblacion,
  - sede_provincia.
- La migracion local se ha ejecutado correctamente sobre `u438573835_censo_pre.asociaciones`.
- Al guardar se envian esos campos separados a censo.
- Los campos visibles de asociacion son editables.
- El campo `tipo_asociacion` se edita como selector:
  - Foguera = 2,
  - Barraca = 1.
- La lectura/edicion queda protegida por permisos.
- Hay tests para la separacion de direccion compuesta y el payload enviado a censo.

Pendiente operativo:

- Ejecutar la misma migracion en test/prod cuando corresponda.
- Reiniciar/desplegar `ffsj-new-censo-api` en cada entorno para cargar el OpenAPI actualizado.
- Confirmar si la intranet antigua debe sincronizar tambien las nuevas columnas ampliadas.

## 8. Asociados: listado, detalle y exportacion

Estado actual: completado para el alcance actual.

- Los asociados se cargan desde `ffsj-new-censo-api`.
- Se filtran por asociacion activa usando `idAsociacion`.
- Hay pestanas de adultos e infantiles.
- Hay paginacion por pestana.
- Hay filtrado por nombre, apellidos, cargo, ID y datos basicos disponibles.
- El listado queda ordenado alfabeticamente por nombre por defecto.
- Hay exportacion Excel.
- La columna `Cargo` muestra el cargo del ejercicio actual calculado desde el historico permitido.
- Si la API no marca infantiles, se clasifican provisionalmente como infantiles los menores de 18 anos a fecha `01/07/2026`.
- El detalle muestra los campos reales disponibles: DNI/NIF, SIP, telefono, email, fecha nacimiento, fecha alta y estado.
- La exportacion Excel incluye los campos reales disponibles.
- Hay tests para la clasificacion provisional adulto/infantil.
- La lectura queda protegida por permisos de ruta/menu.

Pendiente futuro, no bloqueante:

- Si censo incorpora un campo explicito adulto/infantil, sustituir la clasificacion provisional por edad.
- Revisar UX movil de tablas dentro de la tarea general de UX.

## 9. Historico de cargos de asociados

Estado actual: completado para el alcance actual.

- `ffsj-new-censo-api` expone `GET /asociados/{asociado}/historico`.
- `ffsj-secretaria` consume el historico desde `CensoService`.
- El detalle del asociado muestra el historico de cargos por ejercicio y asociacion permitidos segun el acceso.
- En acceso Asociaciones, el historico queda filtrado a la asociacion autenticada.
- En acceso Administracion global, el historico completo queda disponible.
- La exportacion Excel incluye una hoja `Historico` con los cargos historicos permitidos para cada asociado.
- Hay test para el mapeo del historico recibido desde censo.
- Hay tests para garantizar que una asociacion no ve historico de otras asociaciones y que administracion global ve el historico completo.

Pendiente futuro, no bloqueante:

- Si censo anade mas campos al historico, ampliar el detalle/exportacion con esos datos.
- Revisar rendimiento de la exportacion si hay asociaciones con muchos asociados, porque ahora consulta historico por asociado.

## 10. Gestion de altas, cambios y bajas: registro pendiente

Estado actual: completado para el alcance actual.

- Alta, cambio y baja crean items en `registro pendiente`.
- Cada pestana tiene boton de pendientes con contador.
- Al pulsar el boton se abre una subvista de pendientes del tipo actual.
- Se pueden seleccionar items y generar una solicitud registrada.
- Existe boton `Volver atras`.
- La solicitud queda guardada en BD de secretaria.
- Se pueden descartar items pendientes antes de generar solicitud.
- Se evita duplicar registros pendientes:
  - cambios/bajas sobre el mismo asociado,
  - altas con el mismo DNI/NIE dentro de la misma asociacion.
- Los cambios muestran diferencias entre datos originales y datos nuevos en la vista de pendientes.
- Los listados de seleccion de asociados en modificaciones y bajas tienen busqueda, orden alfabetico y paginacion.
- Los asociados con cambio o baja pendiente aparecen deshabilitados y sombreados segun la operacion en todos los listados de gestion.
- Tras generar una solicitud, la pantalla cambia a `Solicitudes pendientes` y enfoca la solicitud creada.
- Las acciones estan protegidas por `solicitudes:write` en front y API.

Pendiente futuro, pendiente de reglas de negocio:

- Permitir editar items pendientes antes de generar solicitud si secretaria lo necesita.
- Evitar duplicados tambien contra solicitudes abiertas ya registradas, no solo contra registro pendiente.
- Ampliar validaciones obligatorias por tipo de tramite cuando se definan las reglas finales.
- Validar cupos/cargos antes de generar solicitud cuando el modulo de cargos y cupos este cerrado.

## 11. Solicitudes pendientes

Estado actual:

- Hay listado de solicitudes registradas.
- Hay detalle al hacer click.
- Cada solicitud muestra color por tipo:
  - alta,
  - cambio,
  - baja.

Pendiente:

- Crear accion `Enviar a secretaria`.
- Cambiar estado de `registrada` a `enviada`.
- Bloquear edicion cuando una solicitud este enviada.
- Anadir historico de estados.
- Mostrar fecha de envio, fecha de revision y fecha de validacion.
- Crear vista de detalle completa con items, datos originales/nuevos y posibles incidencias.
- Permitir cancelar una solicitud registrada si aun no se ha enviado.
- Preparar justificante de registro de solicitud.
- Aplicar permisos de lectura/envio/cancelacion.

## 12. Envio a secretaria y validacion

Estado actual:

- No implementado. De momento solo se registran solicitudes.

Pendiente:

- Endpoint `POST /solicitudes/{id}/enviar`.
- Endpoint `POST /solicitudes/{id}/validar`.
- Endpoint `POST /solicitudes/{id}/rechazar`.
- Endpoint `POST /solicitudes/{id}/finalizar`.
- Definir que usuarios pueden validar.
- Definir como se aplica el cambio final en `ffsj-new-censo-api`.
- Definir rollback o gestion de errores si falla la sincronizacion con censo.
- Auditar cada cambio de estado.
- Aplicar permisos de validacion.

## 13. Cargos y cupos

Motivo del orden:

- Debe entrar antes de cerrar por completo altas/cambios/bajas, porque sus reglas pueden bloquear solicitudes.

Estado actual:

- Existe endpoint `/cargos/resumen`.
- Existe servicio front preparado.

Pendiente:

- Crear UI de resumen de cargos.
- Cargar cargos reales desde censo.
- Combinar cargos validados con solicitudes pendientes de secretaria.
- Validar maximos y requeridos.
- Avisar antes de generar solicitudes que incumplan cupos.
- Diferenciar visualmente cargos validados, pendientes y faltantes.

## 14. Incidencias

Estado actual:

- Existe endpoint base en `ffsj-secretaria-api`.
- Existe servicio front preparado.

Pendiente:

- Crear componente reutilizable de incidencias.
- Vincular incidencias con solicitudes, registros e inscripciones.
- Permitir responder/subsanar incidencias.
- Permitir cerrar incidencias.
- Bloquear envio o validacion si hay incidencias abiertas.
- Anadir adjuntos a incidencias.
- Mostrar contador de incidencias en listados.

## 15. Adjuntos

Estado actual:

- Hay diseno de tabla `secretaria_adjuntos`.
- No hay subida real implementada.

Pendiente:

- Implementar subida binaria en `ffsj-secretaria-api`.
- Guardar metadatos de adjuntos en BD.
- Definir storage: disco, FTP, blob storage o similar.
- Validar tamano maximo y tipos permitidos.
- Asociar adjuntos a solicitud, registro, inscripcion e incidencia.
- Implementar descarga segura.
- Implementar borrado si el tramite aun permite edicion.

## 16. Justificantes PDF

Estado actual:

- Existe endpoint placeholder de justificantes.

Pendiente:

- Generar PDF real para solicitudes.
- Generar PDF real para registros.
- Generar PDF real para inscripciones.
- Guardar metadatos del justificante generado.
- Permitir descarga posterior.
- Definir plantilla visual oficial.
- Incluir numero, fecha, asociacion, items y estado.

## 17. Registro documental y comunicaciones

Estado actual:

- La pantalla existe.
- Crea registros contra `ffsj-secretaria-api`.
- Usa el numero devuelto por API.
- La persistencia sigue incompleta o pendiente de consolidar.

Pendiente:

- Persistencia real en BD.
- Historico real por asociacion.
- Adjuntos multiples.
- Validacion de tamano/tipo de archivo.
- Estados reales: recibido, leido, validado, incidencia, rechazado.
- Descarga/impresion de justificante.
- Separar claramente documentacion oficial y comunicaciones.
- Aplicar permisos de lectura/creacion.

## 18. Actividades y calendario

Motivo del orden:

- Conviene implementarlo antes de cerrar inscripciones, porque las inscripciones pueden depender de actividades/plazos.

Estado actual:

- Existe endpoint `/actividades`.
- Existe servicio front preparado.

Pendiente:

- Crear modulo visual de actividades.
- Listar actividades activas/cerradas.
- Detalle de actividad.
- Filtros por estado y fecha.
- Vincular actividades con inscripciones y solicitudes.
- Definir si las actividades son de secretaria o vienen de otro sistema.

## 19. Inscripciones

Estado actual:

- Pantalla existente.
- Carga formularios desde `ffsj-secretaria-api`.
- Envia entradas.

Pendiente:

- Persistencia real en BD.
- Formularios dinamicos desde `secretaria_formularios`.
- Edicion de formularios por plazo.
- Bloqueo fuera de plazo.
- Historico de inscripciones enviadas.
- Seleccion de asociados participantes desde censo.
- Estados reales e incidencias.
- Justificante PDF.
- Aplicar permisos de lectura/envio.

## 20. Textos y codificacion

Estado actual:

- Hay textos con mojibake heredado en varias plantillas.

Pendiente:

- Revisar todos los textos visibles.
- Corregir codificacion a UTF-8.
- Unificar castellano/valenciano.
- Evitar textos tecnicos visibles en la UI.

## 21. UX pendiente

Pendiente:

- Mejorar mensajes de exito/error.
- Anadir spinners o estados de carga por accion.
- Evitar doble click en acciones que crean registros.
- Confirmaciones antes de operaciones importantes.
- Mejorar experiencia movil en tablas.
- Revisar que no haya textos solapados.

## 22. Despliegue

Pendiente:

- Definir proceso de despliegue para `ffsj-secretaria-api`.
- Confirmar URLs definitivas local/test/prod.
- Ejecutar migraciones en cada entorno.
- Reiniciar servicios tras cambios de API.
- Verificar login y flujos completos contra cada entorno.
