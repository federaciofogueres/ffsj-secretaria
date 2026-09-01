# Changelog

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
