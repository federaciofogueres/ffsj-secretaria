# Funcionalidades a incorporar en ffsj-secretaria

Este documento recoge el backlog recomendado para migrar a `ffsj-secretaria` las funcionalidades de secretaria que hoy estan en `web-intranet` y completar las pantallas ya creadas.

Regla de integracion:

- Todo lo que sea dato censal compartido con la gestion del censo debe consumir la API de censo existente (`ffsj-new-censo-api`): asociaciones, asociados, cargos censales, tipos de asociacion, historico censal y autenticacion si se reutiliza el mismo sistema.
- Todo lo que sea puramente de secretaria y no pertenezca al censo debe consumir una API nueva: `ffsj-secretaria-api`.
- La nueva API `ffsj-secretaria-api` se ha creado como proyecto hermano en `G:\Proyectos\FFSJ\ffsj-secretaria-api` y expone un contrato inicial bajo `/emjf1/Secretaria/1.0.0`.

Cada bloque incluye instrucciones pensadas para pasarselas a Codex como tareas separadas.

## 1. Base tecnica e integracion de APIs

Objetivo: dejar preparada la app para consumir dos APIs segun dominio.

Instrucciones para Codex:

```text
En ffsj-secretaria, crea una capa de servicios HTTP separada por dominio. Usa la API de censo para asociaciones, asociados y cargos censales. Usa ffsj-secretaria-api para solicitudes, registros, comunicaciones, inscripciones de secretaria, actividades e incidencias. No mezcles responsabilidades. Sustituye mocks solo si existe endpoint documentado; si no existe, define interfaces TypeScript y metodos preparados con TODO claro. Mantén componentes standalone, RxJS y Angular 20.
```

Criterios:

- Ninguna URL hardcodeada fuera de `src/environments`.
- Entorno con base path para censo y base path para secretaria.
- Servicios separados: `censo/*` y `secretaria/*`.
- Modelos TypeScript compartidos por dominio.
- Loading/error consistente en todos los componentes.

## 2. API ffsj-secretaria-api

Objetivo: evolucionar la API nueva para cubrir toda funcionalidad no censal.

Proyecto creado:

```text
G:\Proyectos\FFSJ\ffsj-secretaria-api
```

Endpoints iniciales:

- `GET /health`
- `GET/POST /emjf1/Secretaria/1.0.0/solicitudes`
- `GET/POST /emjf1/Secretaria/1.0.0/registros`
- `GET /emjf1/Secretaria/1.0.0/inscripciones`
- `POST /emjf1/Secretaria/1.0.0/inscripciones/entradas`
- `GET/POST /emjf1/Secretaria/1.0.0/incidencias`

Instrucciones para Codex:

```text
En ffsj-secretaria-api, sustituye los datos en memoria por persistencia real. Define tablas o repositorios para solicitudes de secretaria, registros, adjuntos, inscripciones de secretaria, actividades e incidencias. Mantén el prefijo /emjf1/Secretaria/1.0.0 y actualiza api/openapi.yaml cada vez que cambie el contrato. No incluyas credenciales reales; usa perfiles .env.local, .env.test y .env.prod.
```

Criterios:

- OpenAPI actualizado.
- Servicios separados por recurso.
- Validacion de payloads antes de escribir.
- Respuestas con estado HTTP correcto.
- Preparado para adjuntos y descarga de justificantes.

## 3. Autenticacion y contexto de asociacion

Objetivo: que cada asociacion acceda solo a sus datos.

Decision de API:

- Si el login y los permisos ya existen en censo, reutilizar `ffsj-new-censo-api`.
- Si secretaria necesita permisos propios, crear endpoints en `ffsj-secretaria-api` para contexto y permisos, pero no duplicar usuarios sin necesidad.

Instrucciones para Codex:

```text
Implementa autenticacion en ffsj-secretaria. Revisa ffsj-new-censo-front y ffsj-web-components para replicar el patron existente si aplica. Crea pantalla/ruta de login, guard de rutas privadas, servicio de sesion y contexto de asociacion activa. Si se necesitan permisos especificos de secretaria, consumelos desde ffsj-secretaria-api.
```

Criterios:

- Login funcional y logout visible.
- Guard aplicado a rutas privadas.
- Contexto con `asociacionId`, nombre, tipo y permisos.
- Estados de sesion expirada y error de credenciales.

## 4. Asociacion

Origen en intranet: `apc-clients`, pestanas `Contacto`, `Sede social`, `Otros datos`, `Observaciones`, avatar y control de acceso.

Decision de API:

- Datos censales de asociacion: `ffsj-new-censo-api`.
- Observaciones internas de secretaria o permisos especificos: `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Conecta el modulo Asociacion de ffsj-secretaria con la API de censo para cargar y guardar datos censales de la asociacion activa. Si hay observaciones internas de secretaria, conectalas a ffsj-secretaria-api. Valida CIF/email/telefono y mantiene la estructura visual actual.
```

Criterios:

- Datos oficiales: nombre, CIF, tipo, direccion, ciudad/provincia.
- Contacto: email y telefono.
- Sede social: direccion, CP, ciudad/provincia.
- Datos publicos: ano fundacion, lema, himno, ubicaciones.
- Observaciones internas solo si las soporta `ffsj-secretaria-api`.

## 5. Asociados: consulta y exportacion

Origen en intranet: `apc-clients/content/childs`, listados adultos/infantiles, cargos y exportaciones PDF/CSV.

Decision de API:

- Asociados, cargos censales y exportacion de datos censales: `ffsj-new-censo-api`.
- Justificantes o tramites de secretaria sobre asociados: `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Sustituye el mock de AsociadosService por llamadas a ffsj-new-censo-api. El listado debe cargar adultos e infantiles de la asociacion activa, mantener busqueda, paginacion, detalle y exportacion Excel. Amplia el detalle con DNI/SIP, fecha alta, cargos, estado y datos de contacto si la API los devuelve. Añade estados vacio, cargando y error.
```

Criterios:

- Listados separados adulto/infantil.
- Filtro por nombre, apellidos, documento y cargo.
- Exportacion Excel con los campos visibles y documento.
- Detalle sin datos mock.

## 6. Gestion de altas, modificaciones y bajas

Origen en intranet: `apc-secretary` gestiona solicitudes por tipo, fechas de entrada/validacion, incidencias y PDF de solicitud.

Decision de API:

- La solicitud, estados, incidencias y justificantes viven en `ffsj-secretaria-api`.
- Al validarse una solicitud, la escritura definitiva en censo debera coordinarse con `ffsj-new-censo-api` o con un proceso interno definido.

Instrucciones para Codex:

```text
Conecta Gestion de asociados con ffsj-secretaria-api. Debe permitir crear altas, solicitar modificaciones y solicitar bajas, guardar borradores/pendientes, enviar la solicitud, recibir numero de solicitud, mostrar estado, imprimir/descargar justificante PDF y listar solicitudes pendientes/finalizadas. Usa ffsj-new-censo-api solo para consultar asociados y cargos censales necesarios para preparar la solicitud.
```

Criterios:

- Tipos de solicitud: alta, modificacion, baja.
- Estados: borrador, enviada, con incidencias, validada, rechazada/finalizada.
- Fechas: alta, entrada, validacion.
- Incidencias asociadas a solicitud y a asociado.
- Descarga de documento justificante.

## 7. Cargos y cupos

Origen en intranet: `apc-clients/content/charges` con cargos requeridos, maximos, activos y reasignacion.

Decision de API:

- Reglas censales de cargos: `ffsj-new-censo-api`.
- Solicitudes pendientes que afectan cupos: `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Implementa gestion de cargos combinando ffsj-new-censo-api y ffsj-secretaria-api. Carga cargos disponibles desde censo, indica requeridos, maximos y activos, muestra asociados validados desde censo y solicitados pendientes desde secretaria. Aplica esas reglas antes de enviar altas/modificaciones.
```

Criterios:

- Vista de resumen de cargos.
- Validacion antes de enviar solicitudes.
- Avisos claros al superar maximos o faltar requeridos.
- Diferenciar validados de pendientes.

## 8. Inscripciones

Origen en intranet: `apc-inscriptions`, formularios Gravity Forms, fecha limite, inscritos, validacion, incidencias e impresion PDF.

Decision de API:

- Inscripciones, formularios, entradas, validaciones, incidencias y justificantes: `ffsj-secretaria-api`.
- Seleccion de asociados participantes: `ffsj-new-censo-api`.

Instrucciones para Codex:

```text
Conecta Inscripciones con ffsj-secretaria-api para listar formularios/actividades disponibles, fechas, campos dinamicos, envio, historico, estado, justificante e incidencias. Usa ffsj-new-censo-api solo para cargar asociados adultos/infantiles seleccionables.
```

Criterios:

- Listado de inscripciones disponibles.
- Campos dinamicos por formulario.
- Seleccion de asociados filtrada por tipo permitido.
- Envio real y numero/estado de inscripcion.
- Fecha limite y bloqueo fuera de plazo.

## 9. Registro documental y comunicaciones

Origen en intranet: `apc-secretary/upload/orders`, listados de registros, PDF de orden, fechas de entrada/validacion e incidencias.

Decision de API:

- Todo este modulo pertenece a `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Conecta Registro con ffsj-secretaria-api. La pantalla debe permitir presentar documentacion con adjuntos, enviar comunicaciones sin obligar adjunto, recibir numero de registro, listar registros previos por tipo, descargar justificantes/PDFs, ver estado e incidencias, y reabrir un registro para consultar el resumen enviado. Sustituye el generador aleatorio de REG por el numero devuelto por API.
```

Criterios:

- Adjuntos multiples con validacion de tamano/tipo.
- Estados: recibido, leido, validado, incidencia.
- Historico de registros y comunicaciones.
- Impresion/descarga de justificante real.

## 10. Actividades y calendario

Origen en intranet: `apc-activity`, actividades asociadas a solicitudes e inscripciones.

Decision de API:

- Si son actividades administrativas de secretaria: `ffsj-secretaria-api`.
- Si existe un catalogo comun de actividades en otro proyecto, consumirlo solo si ya esta definido.

Instrucciones para Codex:

```text
Crea el modulo Actividades consumiendo ffsj-secretaria-api. Debe listar actividades activas, mostrar detalle, fechas clave, responsables y relacion con inscripciones o solicitudes de secretaria. Integra el selector de actividad donde las solicitudes antiguas usaban activity_id.
```

Criterios:

- Listado de actividades activas/cerradas.
- Detalle con fechas y responsable.
- Vinculacion con inscripciones y solicitudes.

## 11. Administracion de incidencias

Origen en intranet: incidencias en `apc-secretary/content/keys/ajax/*` y `apc-inscriptions/content/entry/ajax/*`.

Decision de API:

- Incidencias de secretaria: `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Implementa un componente reutilizable de incidencias consumiendo ffsj-secretaria-api. Debe mostrar incidencias asociadas a solicitudes, registros e inscripciones, permitir responder o marcar como subsanada si la API lo permite, y bloquear validacion/envio cuando haya incidencias abiertas segun reglas de negocio.
```

Criterios:

- Lista cronologica de incidencias.
- Estado abierta/subsanada/cerrada.
- Comentarios y adjuntos si existen.
- Integracion en gestion de asociados, registro e inscripciones.

## 12. Permisos y roles

Origen en intranet: usuarios por asociacion y control de acceso.

Decision de API:

- Autenticacion base: preferentemente censo si ya existe.
- Permisos especificos de secretaria: `ffsj-secretaria-api`.

Instrucciones para Codex:

```text
Añade soporte de permisos por usuario. El menu y las acciones deben ocultarse o deshabilitarse segun permisos devueltos por API: lectura, edicion de asociacion, gestion de asociados, inscripciones, registro y administracion. Si son permisos especificos de secretaria, exponlos desde ffsj-secretaria-api. Incluye tests unitarios de guard/permisos.
```

Criterios:

- Permisos centralizados.
- Menu adaptado por rol.
- Acciones protegidas tambien en componente/servicio.

## 13. Limpieza de textos y codificacion

Objetivo: corregir textos corruptos heredados.

Instrucciones para Codex:

```text
Revisa ffsj-secretaria buscando caracteres corruptos como Ã, Ð o Â. Corrige textos visibles en rutas, componentes y plantillas sin alterar logica. Mantén castellano/valenciano coherente con el resto de la aplicacion y ejecuta build al terminar.
```

Criterios:

- Sin mojibake en UI.
- Titulos de rutas correctos.
- README y documentacion en UTF-8.
