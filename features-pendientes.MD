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

Estado actual: completado para el alcance actual.

- Hay listado de solicitudes registradas.
- Hay detalle al hacer click.
- Cada solicitud muestra color por tipo:
  - alta,
  - cambio,
  - baja.
- Las asociaciones gestionan sus solicitudes desde la subseccion `Asociados > Gestion > Solicitudes pendientes`.
- Una solicitud registrada se puede enviar a secretaria.
- Una solicitud enviada, en revision o con incidencias puede cancelar el envio y volver a `registrada`.
- Una solicitud registrada no enviada puede cancelarse.
- El detalle muestra fechas de alta, entrada y validacion cuando existen.
- Al cancelar una solicitud registrada, sus items se descartan y dejan de bloquear al asociado en cambios/bajas pendientes.
- Las acciones usan permisos:
  - `solicitudes:write` para cancelar solicitudes registradas,
  - `solicitudes:send` para enviar y cancelar envio.
- Migracion `005_asociacion_send_permission.sql` creada y ejecutada en local para dar `solicitudes:send` al acceso base de asociaciones.

Pendiente futuro:

- Anadir historico de estados.
- Preparar justificante de registro de solicitud.
- Mejorar vista de detalle con datos originales/nuevos e incidencias cuando esos modulos esten cerrados.

## 12. Envio a secretaria y validacion

Estado actual: completado para el alcance actual.

- `ffsj-secretaria-api` tiene endpoints de cambio de estado:
  - enviar,
  - cancelar envio,
  - cancelar solicitud registrada,
  - validar,
  - rechazar,
  - finalizar.
- La validacion queda protegida por `solicitudes:validate`.
- Las asociaciones no pueden acceder al listado global de solicitudes.
- Los usuarios con permisos de validacion tienen una seccion propia `/solicitudes` a la altura del resto de secciones.
- El endpoint global `/solicitudes/global` acepta tokens administrativos con cargos sin exigir `idAsociacion`.
- La seccion global funciona como `Registro de secretaria`:
  - lista todas las solicitudes de todas las asociaciones,
  - muestra numero, asociacion, total de registros, tipo, estado, fecha de alta y fecha de entrada,
  - enriquece el nombre de asociacion desde censo con fallback al id,
  - incluye resumen de totales,
  - incluye busqueda y filtros por tipo/estado,
  - permite abrir detalle, validar, rechazar, cancelar envio y finalizar.
- El menu y la pantalla de inicio solo muestran `Solicitudes` si el usuario tiene `solicitudes:validate`.
- Hay tests de carga global, filtrado y validacion desde la pantalla de registro.

Pendiente futuro:

- Definir como se aplica el cambio final en `ffsj-new-censo-api`.
- Definir rollback o gestion de errores si falla la sincronizacion con censo.
- Auditar cada cambio de estado.

## 13. Cargos y cupos

Motivo del orden:

- Debe entrar antes de cerrar por completo altas/cambios/bajas, porque sus reglas pueden bloquear solicitudes.

Estado actual: completado parcialmente para el alcance actual.

- Existe endpoint `/cargos/resumen`.
- Existe servicio front preparado.
- `ffsj-secretaria` carga cargos desde censo.
- En bajas, se detectan cargos obligatorios del ejercicio actual usando:
  - `requerido` si el cargo lo trae,
  - y, provisionalmente, nombres que contengan presidencia/presidente o secretaria/secretario.
- Si una baja afecta a un cargo obligatorio:
  - se abre un dialogo para seleccionar sustituto,
  - no se deja continuar sin sustituto,
  - se crea el registro pendiente de baja,
  - se crea tambien un registro pendiente de cambio de cargo para el sustituto,
  - se genera una solicitud conjunta de baja + cambio de cargo obligatorio,
  - se envia automaticamente a secretaria.
- El detalle de la solicitud en administracion muestra el item de baja y el item de cambio de cargo.

Pendiente:

- Definir la matriz oficial de cargos obligatorios/maximos por tipo de asociacion.
- Sustituir la deteccion provisional por datos configurables desde BD.
- Crear UI de resumen de cargos.
- Combinar cargos validados con solicitudes pendientes de secretaria.
- Validar maximos y requeridos.
- Aplicar la sustitucion real en `ffsj-new-censo-api` cuando administracion valide la solicitud.
- Cubrir tambien modificaciones de cargo cuando exista UI especifica para cambiar cargos.
- Diferenciar visualmente cargos validados, pendientes y faltantes.

## 14. Incidencias

Estado actual: completado para el alcance actual.

- Existe endpoint base en `ffsj-secretaria-api`.
- Existe servicio front preparado.
- Existe componente reutilizable `IncidenciasPanelComponent`.
- Las incidencias se vinculan con solicitudes, registros e inscripciones por `scope/scopeId`.
- Se puede crear, responder/subsanar y cerrar incidencias.
- Al crear incidencia sobre solicitud, la solicitud pasa a `con_incidencias`.
- La API bloquea envio y validacion de solicitudes con incidencias abiertas.
- El registro global de solicitudes muestra contador de incidencias abiertas.
- Las asociaciones ven y responden las incidencias desde su propia solicitud registrada en `Asociados > Gestion > Solicitudes pendientes`.
- La respuesta de la asociacion solo requiere permiso `incidencias:read`.
- Las asociaciones no pueden crear, cerrar ni devolver incidencias.
- Crear, cerrar y devolver incidencias exige modo Administracion y permiso `incidencias:write`.
- La respuesta de la asociacion deja la incidencia en estado `respondida`; solo administracion puede resolverla como `subsanada`, `cerrada` o devolverla a `abierta`.
- Administracion puede cerrar una incidencia aunque todavia este `abierta` y no haya sido contestada por la asociacion.
- Una solicitud no se puede validar ni finalizar mientras tenga incidencias `abierta` o `respondida`.
- El panel permite adjuntar ficheros a incidencias.
- Cada incidencia guarda un historico de eventos:
  - creada por administracion,
  - respuesta de asociacion,
  - devolucion de administracion,
  - subsanada,
  - cerrada.
- Cada evento guarda mensaje, actor, fecha y adjuntos propios.
- Cuando administracion devuelve una incidencia, debe indicar motivo y puede adjuntar ficheros; la incidencia vuelve a estado `abierta`.

Pendiente futuro:

- Extender el panel visualmente a registro e inscripciones cuando esas pantallas tengan detalle administrativo.
- Notificaciones a la asociacion cuando administracion cree una incidencia.
- Afinar textos/notificaciones del rebote de incidencias cuando se defina el procedimiento oficial.

## 15. Adjuntos

Estado actual: completado para el alcance actual.

- Hay diseno de tabla `secretaria_adjuntos`.
- Migracion `006_incidencias_adjuntos_justificantes.sql` creada.
- Subida binaria implementada en `ffsj-secretaria-api` con `application/octet-stream`.
- Metadatos guardados en `secretaria_adjuntos`.
- Storage local configurable con `SECRETARIA_STORAGE_ROOT`.
- Validacion de tamano maximo y tipos permitidos.
- Adjuntos asociados a solicitud, registro, inscripcion, incidencia y evento de incidencia por `scope/scopeId`.
- Descarga segura por endpoint protegido.
- Borrado logico implementado.
- Registro documental sube sus ficheros reales tras crear el registro.

Pendiente futuro:

- Decidir storage definitivo para produccion: disco persistente, FTP, S3/blob o similar.
- Antivirus/escaneo de ficheros si se exige.
- Politica fina de borrado segun estado del tramite.
- Interfaz de adjuntos completa en detalles de registro e inscripciones.

## 16. Justificantes PDF

Estado actual: completado para el alcance actual.

- Existe endpoint placeholder de justificantes.
- La API genera PDF real basico sin dependencias externas.
- Guarda el PDF en storage local y actualiza metadatos en `secretaria_justificantes`.
- Permite descarga posterior por endpoint protegido.
- Solicitudes y registro documental tienen accion para generar/descargar justificante.
- El justificante incluye tipo, numero/ID, fecha, asociacion, estado y resumen.

Pendiente futuro:

- Definir plantilla visual oficial.
- Enriquecer datos de inscripciones y registros en la plantilla.
- Incorporar logo oficial, firma/sello y CSV si se define.

## 17. Registro documental y comunicaciones

Estado actual: completado para el alcance actual.

- La pantalla existe.
- Crea registros contra `ffsj-secretaria-api`.
- Usa el numero devuelto por API.
- Persistencia real en BD con tabla `secretaria_registros`.
- Historico real por asociacion en acceso Asociaciones.
- Historico global en acceso Administracion.
- Adjuntos multiples reales mediante `secretaria_adjuntos`.
- Validacion de tamano/tipo de archivo en API.
- Las comunicaciones tienen bandejas:
  - Asociaciones: realizadas y recibidas.
  - Administracion: recibidas y realizadas.
- Si la asociacion inicia una comunicacion, siempre queda en realizadas de la asociacion y recibidas de administracion, aunque administracion responda.
- Si administracion inicia una comunicacion, queda en realizadas de administracion y recibidas de la asociacion.
- Cada comunicacion tiene hilo de mensajes con respuestas de asociacion y administracion.
- Los mensajes del hilo pueden tener adjuntos propios.
- Administracion puede responder comunicaciones recibidas y enviar comunicaciones a una asociacion.
- Asociaciones pueden responder comunicaciones recibidas o realizadas dentro del mismo hilo.
- Estados reales:
  - recibido,
  - leido,
  - validado,
  - incidencia,
  - rechazado.
- Administracion puede cambiar el estado de un registro.
- Descarga de adjuntos reales desde el historico.
- Generacion/descarga de justificante PDF por registro.
- Documentacion oficial y comunicaciones quedan separadas visualmente.
- Permisos aplicados:
  - `registro:read` para listar/ver historico,
  - `registro:write` para crear registros como asociacion,
  - `registro:write` + cargo admin para cambiar estado.

Pendiente futuro:

- Definir workflow oficial de recepcion y lectura por departamentos.
- Vincular incidencias de registro en una pantalla administrativa especifica.
- Mejorar plantilla PDF oficial del justificante.
- Definir si las comunicaciones deben tener destinatarios configurables desde BD.

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
