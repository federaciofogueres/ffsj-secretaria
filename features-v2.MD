# Features v2 pendientes

Documento actualizado el 06/07/2026 tras revisar:

- `funcionalidades.MD` y `features-pendientes.MD`.
- Rutas y componentes de `ffsj-secretaria`.
- Servicios HTTP del front.
- Endpoints, migraciones y tests de `ffsj-secretaria-api`.
- Integraciones recientes con `ffsj-new-censo-api`.

Verificacion tecnica realizada:

- `ffsj-secretaria`: `npm run build:local` correcto.
- `ffsj-secretaria-api`: `npm test` correcto, 11 tests pasan.

## 1. Documentacion y contrato del proyecto

Estado observado:

- `features-pendientes.MD` contiene informacion util, pero mezcla tareas completadas con pendientes futuras.
- `README.md` de `ffsj-secretaria` sigue diciendo que varios modulos usan mocks o envios simulados, pero ya hay integracion real con APIs.
- `README.md` de `ffsj-secretaria-api` sigue indicando que hay endpoints iniciales con datos en memoria, aunque ya existe persistencia MySQL y migraciones.
- `api/openapi.yaml` de `ffsj-secretaria-api` todavia contiene descripciones provisionales en login/contexto.

Pendiente:

- Actualizar `README.md` de `ffsj-secretaria` con el estado real de modulos, APIs, login por asociacion/admin y comandos.
- Actualizar `README.md` de `ffsj-secretaria-api` con BD real, migraciones, storage de adjuntos y scripts disponibles.
- Revisar `api/openapi.yaml` y eliminar textos provisionales que ya no representan la implementacion.
- Mantener `features-v2.MD` como backlog vigente y dejar `features-pendientes.MD` como historico o archivarlo.

## 2. Despliegue y entornos

Estado observado:

- Hay entornos local/test/dev/prod en front.
- `ffsj-secretaria-api` tiene perfiles `LOCAL`, `TEST` y `PROD`.
- Hay migraciones incrementales hasta `013_formularios_inscripcion.sql`.
- Se han tocado tambien comportamientos en `ffsj-new-censo-api`.

Pendiente:

- Ejecutar migraciones pendientes en test/prod para `ffsj-secretaria-api`.
- Ejecutar migraciones pendientes en test/prod para campos nuevos de censo cuando aplique.
- Desplegar/reiniciar `ffsj-new-censo-api` en todos los entornos con:
  - login por asociacion,
  - password ampliada,
  - campos separados de asociacion,
  - `tipo` de asociado calculado por cargos activos.
- Definir procedimiento operativo: migrar, desplegar API, reiniciar servicio, validar smoke test.
- Crear checklist de smoke test por entorno:
  - login asociacion,
  - login admin,
  - cargar asociados,
  - guardar asociacion,
  - crear/validar solicitud,
  - crear inscripcion,
  - crear comunicacion.

## 3. Autenticacion, sesion y permisos

Estado observado:

- Hay dos accesos diferenciados:
  - Asociaciones: CIF + password de asociacion.
  - Administracion: login de persona con cargo admin.
- El menu y las rutas se filtran por permisos.
- `ffsj-secretaria-api` conserva una funcion `login()` demo y un contexto con fallback demo en `SecretariaService.js`.
- Existen endpoints historicos de roles por asociacion que ya no encajan del todo con el modelo actual basado en permisos base de asociacion y permisos por cargo administrativo.

Pendiente:

- Eliminar o aislar el login demo de `ffsj-secretaria-api` si no se usa en la aplicacion real.
- Revisar que `/contexto` no devuelva permisos demo si el token no es valido o no tiene tipo de acceso claro.
- Revisar endpoints de roles por asociacion y decidir:
  - eliminarlos,
  - ocultarlos de OpenAPI,
  - o mantenerlos solo si habra un uso real.
- Definir matriz final de permisos por cargo administrativo.
- Anadir tests de API para permisos por endpoint critico, no solo tests unitarios de deteccion de admin.

## 4. Asociacion

Estado observado:

- La pantalla carga y guarda datos de asociacion contra censo.
- El tipo se selecciona como `Foguera = 2` y `Barraca = 1`.
- Los campos de direccion/localidad/provincia/codigo postal ya estan separados en UI y BD local.

Pendiente:

- Confirmar migracion de campos nuevos de `asociaciones` en test/prod.
- Validar reglas de negocio de campos:
  - CIF obligatorio y formato,
  - email valido,
  - telefono,
  - codigo postal,
  - campos publicos opcionales.
- Confirmar si los campos nuevos deben sincronizarse con la intranet antigua o solo vivir en el nuevo censo.
- Anadir tests end-to-end o de integracion para guardar y recargar datos separados.

## 5. Asociados: listado, detalle, historico y exportacion

Estado observado:

- El listado consume censo.
- Hay adultos/infantiles, busqueda, ordenacion, paginacion, cargo del ejercicio actual y exportacion.
- El historico se filtra por asociacion en acceso Asociaciones y es completo en Administracion.
- `AsociadosService` usa `shareReplay(1)`, por lo que puede quedarse con datos cacheados tras validar solicitudes si no se invalida.

Pendiente:

- Anadir mecanismo de refresco/invalidation del listado de asociados tras:
  - validar solicitud,
  - finalizar solicitud,
  - volver desde gestion de altas/cambios/bajas.
- Sustituir definitivamente la clasificacion por edad cuando censo devuelva siempre `tipo`.
- Revisar rendimiento del historico/exportacion en asociaciones grandes.
- Mejorar vista movil de tablas.
- Anadir tests para que un asociado dado de baja en el ejercicio siga apareciendo apagado y no sea editable.

## 6. Altas, modificaciones y bajas

Estado observado:

- Hay registro pendiente por tipo.
- Hay solicitudes registradas y envio a administracion.
- La validacion aplica cambios en censo mediante `CensoPersistenceService`.
- Hay bloqueo de asociados con baja/cambio pendiente.
- Los cargos son multiseleccion.
- Presidencia/Secretaria se tratan provisionalmente como cargos obligatorios/exclusivos.
- Si un alta o cambio intenta asignar un cargo exclusivo ya ocupado, se genera solicitud conjunta con cesion del cargo anterior.

Pendiente:

- Definir tabla/regla oficial de cargos obligatorios y maximos por tipo de asociacion.
- Dejar de detectar cargos obligatorios por texto (`presid`, `secretar`) y usar datos configurables.
- Validar fechas de alta:
  - no permitir fechas de nacimiento futuras,
  - validar mayoria/infantil segun tipo,
  - normalizar formato.
- Permitir editar items del registro pendiente antes de generar solicitud si secretaria lo confirma como necesario.
- Evitar duplicados tambien contra solicitudes abiertas, no solo contra registros pendientes.
- Guardar auditoria de aplicacion en censo:
  - resultado por item,
  - `asociadoId` creado en altas,
  - errores de persistencia,
  - fecha de aplicacion real.
- Revisar si `validada` y `finalizada` deben ser dos pasos o si la validacion ya debe finalizar el expediente en algunos tramites.

## 7. Cargos y cupos

Estado observado:

- Existe `/cargos/resumen`.
- El front carga cargos de censo.
- Hay reglas parciales para sustitucion de cargos obligatorios.
- No hay una pantalla completa de cupos/cargos.

Pendiente:

- Crear UI de resumen de cargos por asociacion:
  - cargos requeridos,
  - cargos maximos,
  - cargos actuales,
  - pendientes de solicitud,
  - faltantes.
- Definir modelo BD para reglas:
  - cargo obligatorio,
  - maximo por asociacion,
  - aplicable a foguera/barraca,
  - aplicable adulto/infantil,
  - exclusivo o multiple.
- Aplicar esas reglas antes de crear registro pendiente y antes de validar en API.
- Mostrar diferencias entre cargos validados y cargos pendientes.

## 8. Solicitudes y registro de secretaria

Estado observado:

- Asociaciones ven sus solicitudes dentro de gestion de asociados.
- Administracion tiene seccion global `/solicitudes`.
- El detalle se abre como dialog.
- Se puede validar, rechazar, cancelar envio, finalizar y descargar justificante.
- Las incidencias abiertas/respondidas bloquean validacion/finalizacion.

Pendiente:

- Anadir historico/auditoria de estados de solicitud:
  - creada,
  - enviada,
  - en revision,
  - incidencia,
  - validada,
  - rechazada,
  - finalizada,
  - cancelada.
- Mejorar detalle de cambios para datos compuestos y cargos multiples.
- Mostrar resultado de aplicacion en censo por item.
- Definir rollback o compensacion si una solicitud con varios items falla a mitad de aplicacion.
- Preparar filtros avanzados para administracion:
  - fechas,
  - asociacion,
  - estado,
  - tipo,
  - con/sin incidencias.

## 9. Incidencias

Estado observado:

- Hay panel reutilizable.
- Administracion puede crear, devolver, cerrar/subsanar.
- Asociacion puede responder.
- Hay eventos de incidencia y adjuntos.
- Validacion/finalizacion se bloquea si hay incidencias abiertas o respondidas.

Pendiente:

- Integrar el panel de incidencias en detalle administrativo de registros e inscripciones, no solo en solicitudes.
- Mejorar notificaciones visuales para asociaciones cuando tengan incidencias nuevas.
- Decidir si se enviaran avisos por email.
- Refinar textos oficiales para estados:
  - abierta,
  - respondida,
  - subsanada,
  - cerrada sin subsanar.
- Revisar permisos de adjuntos: ahora el endpoint de adjuntos usa permisos de incidencias de forma generica, aunque se use tambien para registro e inscripciones.

## 10. Adjuntos y storage

Estado observado:

- Hay subida binaria y almacenamiento local configurable.
- Hay validacion de tamano/tipo.
- Hay descarga protegida y borrado logico.

Pendiente:

- Decidir storage definitivo de produccion:
  - disco persistente,
  - FTP,
  - S3/blob,
  - otro.
- Definir politica de retencion y borrado.
- Anadir antivirus/escaneo si es requisito.
- Separar permisos de adjuntos por modulo:
  - solicitudes,
  - registro,
  - inscripciones,
  - incidencias.
- Mejorar UI de adjuntos en todos los detalles.

## 11. Justificantes, impresion y exportacion

Estado observado:

- Hay PDF basico de justificantes en API.
- En inscripciones se usa impresion HTML/CSV desde front para entradas.
- Los PDF todavia no tienen plantilla oficial.

Pendiente:

- Definir plantilla oficial:
  - logo,
  - cabecera,
  - sello/firma,
  - CSV o codigo de verificacion si aplica.
- Migrar impresiones importantes a generacion server-side cuando se quiera trazabilidad.
- Crear justificante especifico de:
  - solicitud,
  - registro documental,
  - comunicacion,
  - inscripcion individual,
  - listado completo de inscritos.
- En inscripciones, asegurar que los campos de asociados se imprimen siempre con nombre, DNI y datos relevantes, no solo IDs.

## 12. Registro documental y comunicaciones

Estado observado:

- Hay registro documental con adjuntos.
- Hay comunicaciones con bandejas realizadas/recibidas.
- Las comunicaciones tienen hilo de mensajes.
- Administracion puede iniciar comunicaciones a una asociacion, pero la seleccion de asociacion es por campo numerico.

Pendiente:

- Sustituir campo numerico de asociacion por buscador/selector real de asociaciones.
- Definir responsables/departamentos desde BD en vez de array fijo en front.
- Crear filtros y busqueda en historicos de registros/comunicaciones.
- Integrar incidencias de registro en el detalle.
- Definir workflow oficial de estados de registro.
- Definir si una comunicacion puede tener varios destinatarios.
- Definir lectura/notificacion: leido por quien y cuando.

## 13. Calendario y actividades

Estado observado:

- Hay seccion `/calendario`.
- Administracion puede crear, editar, desactivar, archivar y borrar actividades.
- Al pulsar un dia se ven actividades del dia.
- Se pueden vincular inscripciones existentes o crear una inscripcion vinculada desde el detalle de actividad.
- Asociaciones ven calendario y detalle.

Pendiente:

- Mejorar UX visual del calendario:
  - vista mensual mas clara,
  - listado lateral por dia,
  - estados activo/cerrado/archivado,
  - responsive movil.
- Anadir filtros por fecha, estado y tipo.
- Definir si habra actividades recurrentes.
- Definir reglas de visibilidad publica:
  - activa visible,
  - cerrada visible o no,
  - archivada nunca visible.
- Vincular actividades con solicitudes si secretaria lo necesita.

## 14. Formularios de inscripcion

Estado observado:

- Existe seccion admin `Formularios`.
- Permite crear campos dinamicos.
- Hay tipos de campo:
  - texto,
  - numero,
  - fecha,
  - seleccion manual,
  - asociados,
  - asociados adultos,
  - asociados infantiles,
  - responsable.
- Un formulario puede reutilizarse en inscripciones.

Pendiente:

- Mejorar editor para usuarios no tecnicos:
  - reordenar campos,
  - duplicar campos,
  - vista previa,
  - ayuda contextual,
  - validaciones visuales por tipo.
- Permitir opciones dinamicas configurables:
  - asociados,
  - adultos,
  - infantiles,
  - cargos,
  - asociaciones si aplica.
- Definir campos condicionales si se necesitan.
- Impedir claves internas duplicadas en el mismo formulario.
- Anadir tests de guardado/edicion/borrado de formularios.

## 15. Inscripciones

Estado observado:

- Administracion ve listado y detalle de inscripciones.
- Hay tabs de documentacion, gestion e inscritos.
- Asociaciones ven listado y detalle en pagina separada.
- Asociaciones pueden inscribirse, ver resumen y modificar dentro de plazo.
- El listado de asociados para inscripcion es real desde censo, con tabs, busqueda, ordenacion y paginacion.
- Las entradas administrativas pueden imprimirse o descargarse en CSV/PDF via front.

Pendiente:

- Completar estados administrativos de entradas:
  - recibida,
  - en revision,
  - validada,
  - rechazada,
  - con incidencia.
- Integrar incidencias sobre entradas de inscripcion.
- Permitir adjuntar documentacion propia de una inscripcion desde administracion.
- Permitir que la asociacion adjunte documentos si el formulario lo requiere.
- Mejorar la pagina de resumen de asociacion para que sea identica al justificante final.
- Generar PDF server-side para inscripciones si se necesita archivo oficial.
- Revisar si una asociacion puede modificar una entrada ya enviada o si debe quedar historico de versiones.
- Anadir tests de:
  - inscripcion existente en modo ver,
  - modificar dentro de plazo,
  - bloqueo fuera de plazo,
  - seleccion masiva de asociados,
  - campos dinamicos de responsable/asociado.

## 16. API y persistencia de censo

Estado observado:

- `CensoPersistenceService` aplica altas, cambios y bajas en censo.
- Hay tests para baja, cambio de cargos, cargo obligatorio y alta con cargo exclusivo.
- La aplicacion marca items como validados tras aplicar la solicitud.

Pendiente:

- Persistir en secretaria el resultado detallado de aplicacion en censo.
- Guardar el `idAsociado` generado en altas para trazabilidad.
- Revisar transaccion distribuida: secretaria y censo usan conexiones/BD diferentes.
- Definir estrategia si censo falla despues de haber cambiado parte de una solicitud.
- Ampliar tests de persistencia:
  - alta con asociado existente por DNI,
  - baja de asociado ya dado de baja,
  - cambio de datos personales sin cambio de cargo,
  - varios cargos obligatorios en una misma solicitud,
  - cargo maximo no obligatorio.

## 17. Seguridad

Estado observado:

- Hay Bearer token y middleware de permisos.
- Hay validaciones basicas de payload.
- Hay subida de ficheros con limite.

Pendiente:

- Revisar CORS por entorno.
- Revisar expiracion de tokens y refresh/logout.
- Revisar que no haya endpoints administrativos accesibles con token de asociacion.
- Revisar autorizacion por `asociacionId` en todos los endpoints de detalle, no solo en listados.
- Revisar logs para no exponer datos personales ni tokens.
- Preparar politica RGPD:
  - datos personales,
  - historico,
  - adjuntos,
  - exportaciones.

## 18. Testing

Estado observado:

- Front compila.
- Hay tests unitarios en algunos servicios/componentes.
- API tiene tests de admin y persistencia de censo.

Pendiente:

- Anadir tests front para los flujos nuevos:
  - alta con cargo obligatorio ocupado,
  - modificacion con cesion de cargo,
  - baja con sustitucion,
  - refresco de asociados tras validar,
  - calendario detalle/vinculacion,
  - inscripciones con formulario dinamico.
- Anadir tests API para:
  - permisos por endpoint,
  - incidencias con eventos y adjuntos,
  - registro/comunicaciones,
  - formularios/inscripciones.
- Preparar pruebas e2e de flujos completos con datos de test.

## 19. UX, textos y accesibilidad

Estado observado:

- Hay textos con mojibake en partes del codigo/documentacion.
- Hay uso de `window.confirm` en algunas acciones.
- Hay mensajes de error genericos.

Pendiente:

- Corregir mojibake y unificar textos en castellano/valenciano.
- Sustituir `window.confirm` por dialogos consistentes de la libreria.
- Mejorar mensajes de error con causa real cuando API devuelva detalle.
- Anadir spinners por accion y prevenir doble click.
- Revisar responsive de tablas, dialogs y calendario.
- Revisar accesibilidad:
  - labels,
  - foco en dialogs,
  - teclado,
  - contraste.

## 20. Limpieza tecnica

Pendiente:

- Revisar imports y codigo legado no usado.
- Separar componentes grandes:
  - `InscripcionesComponent`,
  - `AsociadosGestionComponent`,
  - `RegistroComponent`.
- Extraer helpers de impresion/exportacion.
- Revisar `shareReplay` y cache de servicios para evitar datos obsoletos.
- Revisar permisos duplicados o no usados.
- Actualizar `Browserslist` porque Angular avisa de navegadores no soportados/ignorados.

