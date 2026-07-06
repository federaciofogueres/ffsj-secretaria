# Descripcion de pantallas para rediseno de ffsj-secretaria

Este documento describe todas las pantallas actuales de `ffsj-secretaria` para que sirva como base de un rediseno completo de la aplicacion.

El objetivo del rediseno es que la aplicacion sea muy facil de entender y usar por perfiles muy diversos: personas jovenes, personas mayores y usuarios con poca soltura tecnologica. La prioridad debe ser reducir dudas, pasos innecesarios, miedo a equivocarse y sobrecarga visual.

## Contexto general

`ffsj-secretaria` es la aplicacion de secretaria de la Federacio de Les Fogueres de Sant Joan.

Tiene dos accesos diferenciados:

- **Acceso Asociaciones**: una asociacion entra con CIF y contrasena. Desde aqui gestiona sus asociados, datos de asociacion, inscripciones, calendario, registro documental y comunicaciones.
- **Acceso Administracion**: una persona entra con login personal y, si tiene cargo administrativo, puede configurar permisos, gestionar calendario/formularios/inscripciones, revisar solicitudes, recibir documentos y responder comunicaciones.

La aplicacion debe transmitir:

- Seguridad: el usuario debe saber que esta haciendo y que va a ocurrir al pulsar un boton.
- Sencillez: lenguaje directo, botones claros, pocas decisiones por pantalla.
- Guiado: los procesos largos deben dividirse en pasos.
- Confianza: estados visibles, confirmaciones y resumen antes/despues de enviar.
- Accesibilidad: botones grandes, textos legibles, contraste alto, formularios faciles.

## Reglas generales de rediseno

- Evitar pantallas con demasiadas acciones visibles a la vez.
- Usar textos orientados a accion: "Enviar solicitud", "Guardar cambios", "Volver al listado".
- Priorizar flujos paso a paso para tramites complejos.
- Separar claramente:
  - consultar informacion,
  - editar informacion,
  - enviar/tramitar informacion.
- Evitar tecnicismos como "payload", "item", "scope", "endpoint", "registro pendiente" si se puede explicar mejor.
- Usar iconos solo como ayuda visual, nunca como unico significado.
- Mostrar siempre el estado actual de cada tramite.
- Confirmar operaciones irreversibles o importantes.
- Mostrar resumen final tras enviar cualquier solicitud, comunicacion o inscripcion.
- El menu debe ser estable, claro y con nombres comprensibles.
- En movil, las tablas deberian convertirse en tarjetas o listados legibles.

## Estructura global

### Cabecera y navegacion

Estado actual:

- Cabecera roja con logo FFSJ, nombre "FFSJ Secretaria" y subtitulo "Gestion interna".
- Menu horizontal en escritorio.
- Menu desplegable y barra inferior en movil.
- Las opciones visibles dependen de permisos.
- Boton "Salir".

Opciones principales:

- Asociados
- Asociacion
- Calendario
- Inscripciones
- Formularios
- Registro
- Solicitudes
- Admin

Necesidades de rediseno:

- Hacer mas evidente si el usuario esta en modo Asociacion o Administracion.
- Mostrar el nombre de la asociacion o del usuario/admin activo.
- Revisar si la barra inferior movil puede saturarse con demasiadas opciones.
- Usar nombres consistentes:
  - "Asociacion" podria ser "Datos de la asociacion".
  - "Registro" podria diferenciar "Documentos y comunicaciones".
  - "Solicitudes" en administracion podria ser "Registro de solicitudes".

## 1. Login de Asociaciones

Ruta: `/login`

Usuarios:

- Asociaciones.

Funcion:

- Permite entrar con CIF y contrasena de asociacion.

Contenido actual:

- Logo.
- Titulo "Secretaria FFSJ".
- Subtitulo "Acceso por asociacion".
- Campo CIF.
- Campo contrasena.
- Boton "Iniciar sesion".

Problemas o riesgos:

- El usuario puede no saber si debe entrar con su DNI personal o con el CIF de la asociacion.
- Los errores de login deben ser muy claros.

Necesidades de rediseno:

- Texto de ayuda visible: "Entra con el CIF de tu asociacion y la contrasena facilitada".
- Enlace o bloque de ayuda: "No recuerdo la contrasena" / "No se cual es el CIF".
- Diferenciar claramente este acceso del acceso administrativo.
- Boton grande y claro.

## 2. Login Administrativo

Ruta: `/admin` cuando no hay sesion administrativa.

Usuarios:

- Personas con acceso administrativo.

Funcion:

- Permite entrar con login personal.
- Solo acceden quienes tienen cargo administrativo.

Contenido actual:

- Componente de login personal.
- Titulo "Administracion FFSJ".
- Subtitulo "Acceso de personas".
- Si no tiene permisos, aparece mensaje de acceso no autorizado y boton para cambiar usuario.

Necesidades de rediseno:

- Explicar que este acceso es solo para personal autorizado.
- Si el usuario no tiene permiso, indicar con lenguaje sencillo: "Tu usuario no tiene acceso a administracion".
- Permitir volver al login de asociaciones si se ha equivocado.

## 3. Inicio

Ruta: `/`

Usuarios:

- Asociaciones y administracion, segun permisos.

Funcion:

- Pantalla de bienvenida y acceso rapido a modulos.

Contenido actual:

- Hero con "FFSJ Secretaria".
- Texto de bienvenida.
- Tarjetas de modulos disponibles.
- Boton "Registro rapido" en escritorio.

Problemas o riesgos:

- El hero ocupa espacio y puede no aportar mucho para una herramienta de gestion.
- "Mobile first" y "Angular 20" son textos tecnicos que no aportan al usuario final.

Necesidades de rediseno:

- Convertir inicio en panel de tareas frecuentes:
  - "Ver asociados"
  - "Dar de alta un asociado"
  - "Enviar documentacion"
  - "Ver inscripciones abiertas"
  - "Consultar solicitudes"
- Mostrar avisos importantes:
  - solicitudes con incidencia,
  - inscripciones abiertas,
  - comunicaciones nuevas,
  - documentos pendientes.
- Evitar mensajes tecnicos.

## 4. Asociados

Ruta: `/asociados`

Usuarios:

- Asociaciones.
- Administracion si tiene permiso.

Funcion:

- Consultar el listado de asociados de la asociacion.
- Ver adultos e infantiles.
- Buscar, ordenar, paginar y exportar.
- Acceder a gestion de altas, modificaciones y bajas.

Contenido actual:

- Titulo "Asociados".
- Menu de acciones:
  - Gestion de asociados.
  - Descargar Excel.
- Buscador.
- Pestañas "Adultos" e "Infantiles".
- Tabla con:
  - nombre completo,
  - ID,
  - cargo,
  - marca "Baja" si corresponde.
- Paginacion.
- Al hacer click en una fila, se abre detalle del asociado.

Problemas o riesgos:

- El boton de gestion esta oculto en un menu de tres puntos; algunos usuarios no lo encontraran.
- Las tablas pueden ser dificiles en movil.
- "ID" puede ser poco relevante para el usuario.

Necesidades de rediseno:

- Mostrar acciones principales como botones visibles:
  - "Gestionar altas, cambios y bajas"
  - "Descargar listado"
- En movil, usar tarjetas de asociado.
- El detalle debe mostrar los datos importantes de forma clara:
  - nombre,
  - DNI/NIE,
  - telefono,
  - email,
  - cargo actual,
  - estado,
  - historico si procede.
- La baja debe verse de forma clara pero sin impedir consultar el historico.

## 5. Gestion de asociados

Ruta: `/asociados/gestion`

Usuarios:

- Asociaciones.

Funcion:

- Preparar altas, modificaciones y bajas.
- Revisar registros pendientes.
- Generar solicitudes para enviar a secretaria.

Contenido actual:

- Titulo "Altas, modificaciones y bajas".
- Boton "Volver al listado".
- Pestañas:
  - Altas
  - Modificaciones
  - Bajas
  - Solicitudes pendientes

### 5.1 Altas

Funcion:

- Crear un nuevo asociado y anadirlo al registro pendiente de altas.

Campos actuales:

- Tipo de hoguera: adulta/infantil.
- Cargo, con seleccion multiple.
- DNI/NIE.
- SIP.
- Fecha de nacimiento.
- Nombre.
- Apellidos.
- Direccion.
- Codigo postal.
- Localidad.
- Provincia.
- Telefono.
- Email.

Acciones:

- Anadir cargo.
- Quitar cargo.
- Anadir alta al registro pendiente.
- Ver altas pendientes si existen.

Reglas especiales:

- Si se asigna un cargo obligatorio/exclusivo ya ocupado, aparece confirmacion para cambiar el cargo del titular anterior al nuevo asociado.
- Si se acepta, se crea y envia una solicitud conjunta a administracion.

Necesidades de rediseno:

- Convertir el alta en un asistente por pasos:
  1. Datos personales.
  2. Contacto.
  3. Cargos.
  4. Revision y confirmar.
- Explicar los cargos obligatorios de forma sencilla.
- Mostrar alertas claras si el cargo ya lo tiene otra persona.
- Sustituir "registro pendiente" por "Borrador de solicitud" o "Cambios preparados", si se considera mas comprensible.

### 5.2 Modificaciones

Funcion:

- Seleccionar un asociado existente y preparar cambios.

Contenido actual:

- Listados separados de adultos e infantiles.
- Buscadores por grupo.
- Paginacion.
- Asociados bloqueados si tienen cambio/baja pendiente.
- Al seleccionar un asociado se abre formulario parecido al alta.

Reglas especiales:

- No se puede modificar un asociado dado de baja o bloqueado.
- Si se quita un cargo obligatorio, se pide sustituto.
- Si se asigna un cargo obligatorio ya ocupado, se pide confirmacion de cesion.

Necesidades de rediseno:

- Separar claramente "Seleccionar asociado" y "Editar datos".
- Mostrar una ficha previa antes de editar.
- Resaltar los cambios realizados antes de guardarlos.
- Explicar por que un asociado esta bloqueado.

### 5.3 Bajas

Funcion:

- Seleccionar uno o varios asociados para dar de baja.

Contenido actual:

- Listados separados de adultos e infantiles.
- Busqueda y paginacion.
- Checkboxes.
- Boton "Anadir bajas al registro pendiente".
- Si el asociado tiene cargo obligatorio, se abre dialogo para elegir sustituto.

Necesidades de rediseno:

- Usar un flujo con confirmacion fuerte:
  1. Seleccionar asociados.
  2. Revisar bajas.
  3. Resolver cargos obligatorios.
  4. Confirmar.
- Explicar que la baja no borra el historico.
- Usar color de advertencia para bajas, pero sin alarmar en exceso.

### 5.4 Registros pendientes por tipo

Funcion:

- Revisar altas/cambios/bajas preparadas antes de generar una solicitud.

Contenido actual:

- Boton con contador de pendientes.
- Vista con tabla de items.
- Seleccion multiple.
- Boton "Generar solicitud".
- Boton "Descartar".
- Boton "Volver atras".

Necesidades de rediseno:

- Usar el concepto "Cambios preparados" o "Borradores".
- Mostrar resumen por persona:
  - que se va a cambiar,
  - estado,
  - fecha,
  - accion principal.
- Evitar tablas densas en movil.

### 5.5 Solicitudes pendientes de la asociacion

Funcion:

- Ver solicitudes registradas por la asociacion.
- Enviar a secretaria.
- Cancelar envio.
- Cancelar solicitud si no se ha enviado.
- Ver incidencias y responderlas.

Contenido actual:

- Listado de solicitudes.
- Detalle en panel lateral.
- Estado y tipo con colores.
- Acciones segun estado.
- Panel de incidencias.

Necesidades de rediseno:

- Mostrar estados con lenguaje sencillo:
  - Preparada
  - Enviada a secretaria
  - Con incidencia
  - Validada
  - Finalizada
  - Cancelada
- Mostrar "Que puedo hacer ahora" segun estado.
- Las incidencias deben destacar claramente y tener boton "Responder incidencia".

## 6. Datos de la asociacion

Ruta: `/asociacion`

Usuarios:

- Asociaciones.
- Administracion si tiene permiso.

Funcion:

- Consultar y editar datos oficiales/publicos/de contacto de la asociacion.

Contenido actual:

- Titulo "Datos de la asociacion".
- Boton "Editar datos".
- Modo lectura y modo edicion.
- Secciones:
  - Informacion basica.
  - Informacion publica.
  - Sede social.
  - Contacto.

Campos:

- Nombre oficial.
- Tipo: Foguera/Barraca.
- CIF.
- Direccion.
- Codigo postal.
- Localidad.
- Provincia.
- Año de fundacion.
- Himno.
- Lema.
- Lugar de planta de monumentos.
- Lugar de planta de portada.
- Sede social.
- Email.
- Telefono.

Necesidades de rediseno:

- Mantener la separacion por secciones, pero hacerlas mas faciles de escanear.
- En modo lectura, mostrar datos como ficha, no como inputs deshabilitados.
- En modo edicion, marcar campos obligatorios.
- Mostrar aviso antes de guardar: "Vas a actualizar los datos oficiales de tu asociacion".
- Corregir textos con caracteres corruptos.

## 7. Calendario

Ruta: `/calendario`

Usuarios:

- Asociaciones: consultar actividades.
- Administracion: crear y gestionar actividades.

Funcion:

- Ver actividades en un calendario mensual.
- Seleccionar un dia.
- Ver actividades del dia.
- Ver detalle de una actividad.
- Administracion puede crear, editar, desactivar, archivar o borrar actividades.
- Administracion puede vincular inscripciones a una actividad.

Contenido actual:

- Titulo "Actividades".
- Botones:
  - Añadir actividad, solo admin.
  - Anterior.
  - Siguiente.
- Calendario mensual.
- Panel lateral con:
  - dia seleccionado,
  - listado de actividades,
  - detalle de actividad,
  - inscripciones asociadas.
- Dialogo para añadir actividad.

Necesidades de rediseno:

- Hacer el calendario mas visual y facil:
  - dias con actividad destacados,
  - listado claro de actividades del dia,
  - leyenda de estados.
- En asociacion, priorizar consulta:
  - "Que actividades hay"
  - "Me puedo inscribir"
  - "Ver inscripcion asociada"
- En administracion, separar gestion avanzada en panel claro.
- Evitar meter demasiados formularios en el lateral.

## 8. Inscripciones

Ruta:

- `/inscripciones`
- `/inscripciones/nueva`
- `/inscripciones/:id`

Usuarios:

- Asociaciones.
- Administracion.

Funcion general:

- Asociaciones consultan inscripciones abiertas y se inscriben.
- Administracion crea, edita, archiva o borra inscripciones.
- Administracion revisa asociaciones inscritas.

### 8.1 Listado de inscripciones

Contenido actual:

- Titulo "Inscripciones" o "Inscripciones disponibles".
- Listado de inscripciones.
- Cada elemento muestra:
  - titulo,
  - actividad vinculada,
  - fecha de publicacion,
  - fecha limite,
  - estado, en modo admin.
- En administracion hay botones:
  - Ver detalle,
  - Imprimir,
  - Excel,
  - PDF.
- Boton "Crear inscripcion" en administracion.

Necesidades de rediseno:

- En asociaciones, destacar claramente:
  - abiertas,
  - plazo,
  - ya inscrita/no inscrita,
  - cerrada.
- En administracion, separar acciones mas usadas de acciones secundarias.
- Evitar que los botones de imprimir/exportar saturen cada fila.

### 8.2 Crear/editar inscripcion en administracion

Campos actuales:

- Titulo.
- Formulario reutilizable.
- Actividad vinculada.
- Fecha de publicacion.
- Fecha limite.
- Adultos permitidos.
- Infantiles permitidos.

Acciones:

- Crear.
- Guardar.
- Activar/desactivar.
- Archivar.
- Borrar definitivamente.

Necesidades de rediseno:

- Convertir en formulario guiado:
  1. Datos generales.
  2. Formulario asociado.
  3. Participantes permitidos.
  4. Publicacion/plazo.
  5. Revision.
- Diferenciar claramente archivar de borrar definitivamente.

### 8.3 Detalle de inscripcion para asociaciones

Pestañas actuales:

- Documentacion.
- Formulario.
- Asociados inscritos.

Funcion:

- Ver documentos asociados.
- Rellenar formulario dinamico.
- Seleccionar asociados participantes.
- Enviar inscripcion.
- Si ya esta inscrita, ver resumen y modificar dentro de plazo.

Elementos actuales:

- Campos dinamicos.
- Selectores de asociados/responsable.
- Tabs de adultos/infantiles.
- Busqueda.
- Ordenacion.
- Seleccionar todos.
- Paginacion.
- Boton "Inscribirse" o "Guardar cambios".
- Resumen tras enviar.

Necesidades de rediseno:

- El flujo deberia ser paso a paso:
  1. Leer documentacion.
  2. Rellenar datos.
  3. Seleccionar participantes.
  4. Revisar resumen.
  5. Enviar.
- Indicar claramente si ya esta inscrita.
- Mostrar boton principal unico segun estado.
- El resumen final debe parecerse al justificante.

### 8.4 Detalle de inscripcion para administracion

Pestañas actuales:

- Documentacion.
- Gestion.
- Inscritos.

Funcion:

- Ver documentos asociados.
- Gestionar configuracion.
- Ver asociaciones inscritas.
- Ver detalle de cada entrada.
- Imprimir/exportar una entrada o todas.

Necesidades de rediseno:

- En "Inscritos", usar tabla/tarjetas con filtros.
- Abrir detalle de entrada en dialog o pagina clara.
- Separar acciones:
  - revisar,
  - imprimir,
  - exportar.
- Preparar espacio para futuros estados e incidencias.

## 9. Formularios

Ruta: `/formularios`

Usuarios:

- Administracion.

Funcion:

- Crear plantillas reutilizables de formularios para inscripciones.

Contenido actual:

- Listado lateral de plantillas.
- Editor con:
  - nombre,
  - descripcion,
  - estado.
- Editor de campos.
- Tipos de campo:
  - texto corto,
  - texto largo,
  - telefono,
  - email,
  - numero,
  - fecha,
  - seleccionable manual,
  - asociados de la asociacion,
  - asociados adultos,
  - asociados infantiles,
  - responsable.
- Vista previa.
- Acciones:
  - nuevo formulario,
  - guardar,
  - archivar,
  - borrar.

Problemas o riesgos:

- Es una pantalla compleja para usuarios con poca formacion tecnologica.
- Conceptos como "clave interna opcional" pueden confundir.
- Hay muchos botones de tipo de campo visibles a la vez.

Necesidades de rediseno:

- Hacerlo como constructor visual muy guiado.
- Ocultar conceptos tecnicos avanzados.
- Usar lenguaje:
  - "Pregunta"
  - "Tipo de respuesta"
  - "Obligatoria"
  - "Opciones"
- Permitir reordenar campos de forma intuitiva.
- Incluir ejemplos.
- La vista previa debe ser protagonista.

## 10. Registro documental y comunicaciones

Ruta: `/registro`

Usuarios:

- Asociaciones.
- Administracion.

Funcion:

- Presentar documentacion oficial.
- Enviar comunicaciones.
- Consultar historico.
- Responder hilos de comunicacion.
- Descargar justificantes.

Pantalla inicial actual:

- Dos tarjetas:
  - Presentar documentacion.
  - Realizar comunicacion.

### 10.1 Presentar documentacion

Funcion:

- Enviar documentos oficiales a la Federacion.

Campos:

- Responsable/destinatario.
- Titulo.
- Mensaje/descripcion.
- Adjuntos obligatorios.

Acciones:

- Presentar documentacion.
- Imprimir resguardo.
- Nueva documentacion.

Necesidades de rediseno:

- Explicar diferencia entre documentacion oficial y comunicacion.
- Mostrar claramente que adjuntar documentos es obligatorio.
- Mostrar resumen despues del envio.
- Historico visible y ordenado.

### 10.2 Comunicaciones

Funcion:

- Enviar mensajes entre asociacion y administracion.
- Mantener hilo de respuestas.

Contenido actual:

- Bandejas:
  - realizadas,
  - recibidas.
- Formulario:
  - asociacion destino, solo admin, actualmente ID numerico,
  - destinatario,
  - titulo,
  - mensaje,
  - adjuntos opcionales.
- Hilo de comunicacion.
- Responder en el hilo.

Necesidades de rediseno:

- Sustituir ID de asociacion por buscador.
- Usar apariencia tipo bandeja de mensajes:
  - lista izquierda,
  - conversacion derecha,
  - respuesta al final.
- Diferenciar "comunicacion" de "registro oficial".
- Mostrar estado de lectura si existe.

## 11. Registro de secretaria / Solicitudes globales

Ruta: `/solicitudes`

Usuarios:

- Administracion con permiso de validacion.

Funcion:

- Revisar todas las solicitudes enviadas por asociaciones.
- Validar, rechazar, cancelar envio o finalizar.
- Gestionar incidencias.
- Descargar justificantes.

Contenido actual:

- Resumen superior:
  - total,
  - pendientes de revision,
  - validadas,
  - finalizadas.
- Filtros:
  - buscar,
  - tipo,
  - estado.
- Tabla:
  - numero de solicitud,
  - asociacion,
  - registros,
  - tipo,
  - estado,
  - fecha alta,
  - fecha entrada,
  - detalles.
- Dialog de detalle:
  - metadatos,
  - contenido de solicitud,
  - incidencias,
  - acciones.

Necesidades de rediseno:

- Esta pantalla es critica para administracion; debe parecer una mesa de trabajo.
- Priorizar solicitudes que requieren accion.
- Filtros mas potentes pero sencillos.
- Detalle con acciones bien ordenadas:
  - accion principal,
  - acciones secundarias,
  - acciones peligrosas.
- Mostrar claramente si hay incidencias abiertas.
- Incluir timeline de estados cuando exista.

## 12. Admin / Permisos

Ruta: `/admin` con sesion administrativa.

Usuarios:

- Administracion.

Funcion:

- Configurar permisos base de asociaciones.
- Configurar permisos por cargo administrativo.

Contenido actual:

- Titulo "Permisos por cargo".
- Bloque de ayuda.
- Panel "Acceso Asociaciones".
- Panel "Acceso Administracion".
- Listado de cargos colapsables.
- Checkboxes de permisos por modulo.

Problemas o riesgos:

- Es una pantalla tecnica.
- Los codigos de permisos son necesarios para el sistema, pero no son intuitivos.
- Puede ser peligroso modificar permisos sin entender impacto.

Necesidades de rediseno:

- Hacer una pantalla de administracion avanzada.
- Separar:
  - permisos de asociaciones,
  - permisos de administracion.
- Mostrar descripciones en lenguaje humano como elemento principal.
- Dejar codigo tecnico en segundo plano.
- Añadir resumen de impacto: "Este cargo podra validar solicitudes".
- Añadir confirmacion antes de guardar cambios importantes.

## 13. Incidencias

Componente integrado en:

- Solicitudes de asociacion.
- Solicitudes globales de administracion.
- Futuro: registros e inscripciones.

Usuarios:

- Asociaciones.
- Administracion.

Funcion:

- Administracion crea incidencias.
- Asociacion responde.
- Administracion devuelve, subsana o cierra.

Contenido actual:

- Listado de incidencias.
- Estado.
- Mensajes/eventos.
- Adjuntos.
- Caja de respuesta o cierre segun permisos.

Necesidades de rediseno:

- Tratar incidencias como una conversacion guiada.
- Para asociacion, mostrar solo:
  - que problema hay,
  - que debe responder,
  - boton responder.
- Para administracion, mostrar:
  - crear incidencia,
  - contestacion recibida,
  - devolver,
  - marcar subsanada,
  - cerrar sin subsanar.
- Evitar que la asociacion vea acciones administrativas.

## 14. Dialogos y modales importantes

Dialogos actuales:

- Confirmar modificacion de asociado.
- Seleccionar sustituto para cargo obligatorio.
- Confirmar cambio de cargo obligatorio ocupado.
- Detalle de solicitud en administracion.
- Crear actividad.
- Confirmaciones con `window.confirm` en algunas acciones.

Necesidades de rediseno:

- Unificar estilo de dialogs.
- Evitar dialogs gigantes con demasiada informacion.
- Los dialogs deben responder:
  - Que va a pasar.
  - A quien afecta.
  - Si se puede deshacer.
  - Que boton confirma.
- Botones:
  - accion principal a la derecha,
  - cancelar visible,
  - acciones peligrosas en rojo.

## 15. Estados y colores

Estados usados:

- Solicitudes:
  - registrada,
  - enviada,
  - en_revision,
  - con_incidencias,
  - validada,
  - rechazada,
  - finalizada,
  - cancelada.
- Registros:
  - recibido,
  - leido,
  - validado,
  - incidencia,
  - rechazado.
- Actividades:
  - activa,
  - cerrada/desactivada,
  - cancelada/archivada.
- Inscripciones:
  - abierta,
  - cerrada,
  - archivada.
- Incidencias:
  - abierta,
  - respondida,
  - subsanada,
  - cerrada.

Necesidades de rediseno:

- Crear sistema de estados con colores consistentes:
  - gris: borrador/registrada,
  - azul: enviada/en revision,
  - amarillo/naranja: pendiente de accion/incidencia,
  - verde: validada/finalizada/subsanada,
  - rojo: rechazada/cancelada/baja.
- No depender solo del color; incluir texto e icono.
- Los estados deben tener explicacion breve al pasar el cursor o en detalle.

## 16. Flujos principales a simplificar

### Asociacion

Flujos mas importantes:

1. Entrar.
2. Ver asociados.
3. Dar de alta / modificar / dar de baja.
4. Enviar solicitud.
5. Responder incidencia.
6. Inscribirse a una actividad.
7. Enviar documentacion.
8. Leer/responder comunicacion.

Propuesta de rediseno:

- Inicio con "Tareas pendientes" y "Acciones frecuentes".
- Cada tramite largo como asistente.
- Resumen antes de enviar y despues de enviar.

### Administracion

Flujos mas importantes:

1. Revisar solicitudes pendientes.
2. Abrir detalle.
3. Validar/rechazar o abrir incidencia.
4. Gestionar calendario e inscripciones.
5. Revisar inscritos.
6. Responder comunicaciones.
7. Configurar permisos.

Propuesta de rediseno:

- Inicio administrativo tipo panel de control.
- Bandejas de trabajo:
  - solicitudes pendientes,
  - incidencias respondidas,
  - comunicaciones recibidas,
  - registros documentales.
- Acciones de gestion separadas de acciones de revision.

## 17. Problemas visuales/textuales detectados

- Hay textos con mojibake o codificacion corrupta:
  - "GestiÃ³n"
  - "CategorÃ­a"
  - "AÃ±adir"
  - "DirecciÃ³n"
  - "TelÃ©fono"
- Algunos textos son tecnicos o poco utiles para el usuario final.
- Hay acciones importantes escondidas en menus.
- Algunas pantallas mezclan consulta, edicion y acciones destructivas.
- Algunas vistas usan tablas densas que pueden no funcionar bien en movil.
- En administracion hay pantallas con demasiados botones juntos.

## 18. Resultado esperado del rediseno

El rediseno deberia entregar:

- Arquitectura de informacion nueva.
- Menu principal simplificado por tipo de acceso.
- Wireframes o descripcion visual de cada pantalla.
- Sistema de componentes:
  - cabecera,
  - tarjetas,
  - tablas/listados,
  - formularios,
  - pasos/asistentes,
  - dialogos,
  - estados,
  - alertas,
  - resumen final.
- Reglas de responsive movil.
- Guia de lenguaje:
  - textos de botones,
  - mensajes de error,
  - mensajes de exito,
  - textos de ayuda.
- Propuesta de dashboard para asociaciones y administracion.

## 19. Prompt sugerido para ChatGPT

```text
Actua como experto en UX/UI para aplicaciones administrativas usadas por personas con baja alfabetizacion digital. 

Te paso la descripcion funcional de todas las pantallas de ffsj-secretaria. Necesito que propongas un rediseno completo de la aplicacion, diferenciando acceso Asociaciones y acceso Administracion.

Objetivos:
- que la app sea muy facil de entender,
- que los tramites complejos se hagan paso a paso,
- que el usuario sepa siempre que estado tiene cada solicitud o comunicacion,
- que funcione bien en movil,
- que los textos sean claros para personas jovenes y mayores,
- que se reduzcan errores y dudas.

Entrega:
1. Nueva arquitectura de navegacion.
2. Descripcion redisenada de cada pantalla.
3. Flujos paso a paso para altas, modificaciones, bajas, inscripciones, registro documental, comunicaciones e incidencias.
4. Sistema visual de estados y colores.
5. Componentes reutilizables.
6. Recomendaciones de copywriting y accesibilidad.
7. Prioridades de implementacion por fases.
```

