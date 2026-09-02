# Changelog

## 0.9.6#ESMERALDA - 2026-09-03

### Corregido

- Las fechas de nacimiento se validan con el día local, por lo que la fecha actual se acepta también después de medianoche en España.
- La fecha de nacimiento es obligatoria y una fecha imposible no puede convertirse silenciosamente en un valor vacío válido.
- Los plazos de inscripción del cliente utilizan el día local para coincidir con la regla de negocio.

## 0.9.4#ESMERALDA - 2026-09-02

### Corregido

- La documentación y las comunicaciones recargan el registro tras subir adjuntos, de modo que pueden abrirse inmediatamente sin referencias `undefined`.
- El selector compartido de adjuntos evita repetir el mismo archivo y presenta una acción de retirada más clara.
- El detalle administrativo de Soporte muestra estados como etiquetas y separa visualmente la retirada de adjuntos y el guardado de estado.

## 0.9.3#ESMERALDA - 2026-09-02

### Corregido

- Se estabiliza el flujo de cambios de cargo con sustitución para que los datos requeridos se resuelvan en API.

## 0.9.2#ESMERALDA - 2026-09-02

### Corregido

- El acceso de asociaciones usa la URL de Censo configurada para cada entorno; DEV deja de invocar el endpoint de producción embebido en la librería de autenticación.

## 0.9.1#ESMERALDA - 2026-09-02

### Mejorado

- Inscripciones muestra de forma explícita cuándo una entrada validada o fuera de plazo no se puede modificar ni borrar.
- Las asociaciones pueden borrar con confirmación una entrada propia mientras el plazo esté abierto y no esté validada.
- Administración puede crear una plantilla reutilizable desde la gestión de una inscripción y asociarla al guardar.

## 0.9.0#ESMERALDA - 2026-09-02

### Añadido

- Las asociaciones pueden solicitar la retirada de una inscripción validada o cuyo plazo haya terminado.
- Administración puede aprobar o rechazar la retirada desde el listado de entradas y consultar el historial resultante.

## 0.8.1#ESMERALDA - 2026-09-02

### Testing

- Se cubren filtros, paginación y cambio de página de la bandeja de Solicitudes.
- Se estabilizan los mocks de cupos e incidencias para que la suite Angular complete sus pruebas de regresión.

## 0.8.0#ESMERALDA - 2026-09-02

### Mejorado

- La bandeja administrativa de Solicitudes usa filtros, orden y paginación reales desde la API, incluyendo el filtro global de solicitudes problemáticas.
- Registro reutiliza un selector de adjuntos con lista, tamaño, eliminación, límite visible y bloqueo durante la subida.

## 0.7.3#ESMERALDA - 2026-09-02

### Corregido

- Inscripciones consulta los asociados de Censo para el ejercicio activo, incluido el selector de responsables y participantes adultos.
- La consulta administrativa de participantes usa el mismo ejercicio activo para no resolver nombres con datos de otro ejercicio.

## 0.7.2#ESMERALDA - 2026-09-02

### Corregido

- Registro e Inscripciones toleran adjuntos sin tipo MIME, evitando errores de consola que impedían mostrar el detalle tras crear documentación o comunicaciones.

## 0.7.1#ESMERALDA - 2026-09-02

### Corregido

- Calendario vuelve a seleccionar la actividad recién creada aunque el identificador proceda con distinto tipo desde la API.

## 0.7.0#ESMERALDA - 2026-09-02

### Mejorado

- El detalle administrativo de Soporte prioriza el historial, identifica la asociación y permite mostrar u ocultar el contexto.
- Administración puede responder a una incidencia con adjuntos protegidos y consultar los adjuntos de cada evento de la conversación.
- La bandeja administrativa de Soporte simplifica filtros y listado para una lectura más clara.

## 0.6.0#ESMERALDA - 2026-09-02

### Mejorado

- Confirmaciones accesibles propias para las acciones destructivas de calendario, inscripciones y formularios.
- Etiquetas de estado reutilizables con color e icono en calendario, inscripciones y formularios.
- Navegación por teclado en el listado de inscripciones, foco visible y mejor comportamiento de tablas en pantallas pequeñas.

## 0.5.2#ESMERALDA - 2026-09-02

### Mejorado

- Calendario con filtros por estado y visibilidad, consulta administrativa de archivadas y presentación móvil más compacta.
- La gestión de actividades permite definir si una actividad es visible para las asociaciones.

## 0.5.1#ESMERALDA - 2026-09-02

### Añadido

- El detalle de cada entrada de inscripción permite seleccionar, consultar y abrir sus adjuntos mediante descarga autenticada.

## 0.5.0#ESMERALDA - 2026-09-02

### Añadido

- Workflow administrativo de Inscripciones con estados recibida, en revisión, con incidencias, validada y rechazada.
- Detalle administrativo con historial persistente, gestión de incidencias vinculadas y generación del justificante PDF final.
- Reordenación y duplicado de campos en la configuración de formularios.

### Mejorado

- La bandeja y el detalle de Inscripciones muestran y actualizan el estado de cada entrada de forma clara.

## 0.4.1#ESMERALDA - 2026-09-01

### Mejorado

- Registro e Inscripciones abren adjuntos autenticados, con previsualización de PDF e imágenes y descarga para el resto de formatos.
- Los adjuntos se identifican visualmente por tipo y comunican los errores de apertura.

## 0.4.0#ESMERALDA - 2026-09-01

### Añadido

- Registro usa selectores reales de asociación, departamento y destinatario, sin introducir identificadores manualmente.
- La administración puede mantener los departamentos y personas destinatarias desde la propia bandeja de Registro.
- Las bandejas permiten buscar por número, título o contenido y filtrar por estado.
- El detalle muestra la trazabilidad de cada registro e integra las incidencias vinculadas.

### Mejorado

- Las comunicaciones y la documentación hacen visible su destinatario, área, historial, adjuntos y estado de lectura.

## 0.3.2#ESMERALDA - 2026-09-01

### Mejorado

- El formulario de altas y cambios informa de forma inmediata de los errores en datos personales y de contacto.
- El detalle administrativo muestra únicamente diferencias relevantes, con etiquetas comprensibles entre el valor anterior y el nuevo.
- La bandeja administrativa se actualiza al procesar una solicitud y muestra los mensajes devueltos por la API.

### Corregido

- La administración sólo puede validar o rechazar solicitudes enviadas, y finalizar solicitudes ya resueltas.
- El acceso directo a la pestaña de cupos se reconoce correctamente.

## 0.3.1#ESMERALDA - 2026-09-01

### Añadido

- Pantalla de cupos y cargos por asociación, con ocupación validada, reservas pendientes, disponibilidad y conflictos.
- La bandeja administrativa permite ordenar solicitudes y aislar las problemáticas.
- El detalle administrativo muestra cambios de datos y la trazabilidad de la solicitud.

## 0.3.0#ESMERALDA - 2026-09-01

### Añadido

- La gestión de asociados usa las reglas de obligatoriedad y ocupación de cargos configuradas en Censo.

### Corregido

- Las solicitudes validadas ya no mantienen bloqueado al asociado para nuevos trámites.
- Las sustituciones de cargos obligatorios crean la solicitud y solicitan adjuntar el documento firmado antes de enviarla, respetando el flujo de validación.

## 0.2.3#ESMERALDA - 2026-08-30

### Corregido

- La apertura de adjuntos de Soporte realiza una descarga autenticada, evitando navegaciones internas y errores de permisos.
- La apertura directa de una incidencia desde una tarea pendiente deja de recargar el detalle de forma cíclica.

### Mejorado

- Las incidencias con novedades pendientes se identifican claramente en el seguimiento y en el resumen de tareas.
- El diálogo de conversación y los selectores de adjuntos ofrecen una presentación más clara y consistente.

## 0.2.2#ESMERALDA - 2026-08-30

### Añadido

- Las incidencias de Soporte incorporan conversación cronológica, respuestas de usuario y el estado «Esperando respuesta del usuario».
- El formulario admite adjuntos PNG, JPG, PDF, TXT, DOC, DOCX, XLS y XLSX, hasta 10 MB por archivo.
- El desplegable de asociación muestra el número de incidencias con respuestas de soporte pendientes de leer.

### Seguridad

- Las descargas de adjuntos de Soporte comprueban en la API la propiedad de la incidencia o el permiso administrativo.

## 0.2.1#ESMERALDA - 2026-08-30

### Corregido

- El formulario de soporte muestra las validaciones de categoría, asunto y descripción al intentar enviarlo.
- La administración de incidencias actualiza el detalle y el listado sin requerir una recarga manual.

### Mejorado

- Las filas administrativas indican claramente que se pueden abrir y permiten navegación por teclado.
- El diálogo administrativo organiza contexto, descripción, gestión e historial en un diseño amplio y responsive.

## 0.2.0#ESMERALDA - 2026-08-30

### Añadido

- Área de soporte para crear y consultar incidencias, con categoría, contexto del ejercicio y seguimiento de estado.
- Acceso de soporte administrativo para las personas autorizadas.

### Mejorado

- Soporte y cierre de sesión se integran en el desplegable de asociación, liberando espacio en la navegación principal.
- La pantalla de soporte organiza de forma compacta la creación y el seguimiento de incidencias.

### Corregido

- La navegación desde el menú de asociación conserva correctamente la ruta de soporte.

## 0.1.2#ESMERALDA - 2026-08-30

### Añadido

- Bloque único de contexto que agrupa asociación, tipo, ejercicio y acceso a tareas pendientes.
- Resumen de tareas en la cabecera, con enlaces directos a cada gestión pendiente.

### Mejorado

- El cambio de ejercicio se realiza desde un selector desplegable con buscador y hasta diez resultados visibles.
- La confirmación de inicio de ejercicio utiliza el dialog propio de Secretaría Virtual y evita confirmaciones nativas del navegador.
- Los desplegables de contexto se cierran al navegar, al pulsar fuera o al usar Escape.

### Técnico

- El resumen de dashboard se comparte entre Inicio y cabecera para evitar llamadas duplicadas.
- Se reutiliza un estilo común para los dialogs propios de la aplicación.

## 0.1.1#ESMERALDA - 2026-08-29

### Mejorado

- El listado de asociados obtiene los cargos del ejercicio seleccionado en una única llamada y deja el histórico completo para el detalle individual.
- La interfaz identifica los ejercicios sin iniciar para la asociación conectada y permite inicializarlos desde la aplicación.

### Técnico

- El cliente refresca el ejercicio seleccionado tras su inicialización y actualiza sus pruebas de integración de componentes.
