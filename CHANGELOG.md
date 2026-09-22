# Changelog

## 0.43.3#ESMERALDA — Corrección de respuesta continua en Incidencias

> `0.43.2#ESMERALDA` verificó que el composer de Asociación funciona correctamente en una incidencia `abierta`, pero no cubría el paso siguiente: tras responder, la incidencia pasa a `respondida` (el contador de "abiertas" ya la seguía contando como activa) y el composer, que solo comprobaba `estado === 'abierta'`, desaparecía. Asociación podía responder una única vez por incidencia.

- Nueva constante `ESTADOS_INCIDENCIA_ACTIVOS = ['abierta', 'respondida']` y método `esActiva(incidencia)` en `IncidenciasPanelComponent`, única fuente de verdad de qué estados representan una incidencia todavía activa/no terminal (`subsanada`/`cerrada` son terminales). Sustituye tres comprobaciones que antes podían divergir: el contador `abiertas`, `canAdminManage()` (ya usaba la lista correcta, ahora reutiliza el mismo método) y la condición del composer de Asociación (usaba `=== 'abierta'`, la única realmente desalineada).
- El composer de respuesta de Asociación y el resaltado visual del acordeón (`is-open`) pasan a usar `esActiva(incidencia)` en vez de la comprobación estricta anterior.
- No se ha tocado ninguna regla de cierre, devolución ni de adjuntos (`0.43.2#ESMERALDA` queda intacto): `Marcar subsanada`/`Cerrar sin subsanar`/`Devolver a asociación` siguen exclusivos de Administración y con sus mismas condiciones.
- Tests nuevos: flujo completo `abierta → responde → respondida → sigue viendo el composer → vuelve a responder` (con el segundo envío verificado contra el servicio); un estado terminal (`subsanada`/`cerrada`) no muestra el composer ni permite gestión administrativa y no cuenta como abierta; `esActiva` fijado por contrato para los 4 estados reales.
- Sin cambios de backend: es una condición puramente de presentación en el frontend; el estado real de la incidencia y las reglas de transición en `ffsj-secretaria-api` no se han modificado.
- Validación técnica: `ng build --configuration=development` correcto y suite completa en verde (**367/367**: 361 previos + 6 nuevos).
- Validación manual pendiente: confirmación de Fran en navegador de que Asociación puede mantener una conversación de varios turnos en la misma incidencia sin perder el composer.

## 0.43.2#ESMERALDA — Hotfix crítico de Incidencias: respuesta de Asociación y aislamiento de adjuntos

> Dos regresiones reportadas: (1) Asociación veía sus incidencias pero no podía responderlas, y (2, crítico) adjuntos de otro contexto podían aparecer dentro de una incidencia. Auditoría extremo a extremo (selección → estado frontend → POST → persistencia → `incidencia_evento` → GET → render → descarga, en ambos repos).

- **(1) Composer de Asociación**: revisado a fondo — el gating (`incidencia.estado === 'abierta' && canAssociationRespond`) nunca se tocó desde `0.42.0#ESMERALDA` y un render aislado confirma que el composer aparece y funciona correctamente para Asociación con los inputs correctos. No se ha encontrado ni reproducido ningún defecto de código que lo oculte. Se añaden tests de render permanentes (`app-compact-composer` presente para Asociación en una incidencia abierta, envío con adjunto funcional, ninguna acción administrativa visible) para blindar este contrato de aquí en adelante.
- **(2) CRÍTICO — causa raíz real, confirmada**: `IncidenciasPanelComponent` no limpiaba su estado (`selectedFiles`, `nuevoMensaje`, `responseFiles`, `commentFiles`, `respuestas`, `comentarios`, `expandedIds`, dialogs pendientes) en `ngOnChanges()`. Esto es inofensivo si el host destruye y recrea el componente al cambiar de recurso, pero **no ocurre así** en `asociados-gestion.component.html` (el `*ngIf` que envuelve el panel comprueba solo que `solicitudDetalle` sea no-nulo, no su identidad) ni en `registro.component.html` (mismo patrón con `resultado`): un administrador que deja un adjunto seleccionado a medias en la solicitud/registro A y navega a la B **sin cerrar el panel** podía terminar subiendo ese archivo contra un evento de B. El backend (`ffsj-secretaria-api`) ya resolvía la autorización de cada adjunto correctamente desde `0.43.0#ESMERALDA`; no hacía falta ni se ha tocado nada ahí más allá de añadir tests que lo verifiquen explícitamente.
- **Corrección aplicada en el componente compartido** (no un parche de Inscripciones ni de ningún host): `ngOnChanges()` ahora resetea todo el estado de borrador/adjuntos/acordeón/dialogs antes de recargar. Como `scope`/`scopeId` son los únicos `@Input`, cualquier disparo de `ngOnChanges` implica un recurso distinto (o carga inicial, donde ese estado ya está vacío), así que resetear siempre es correcto y no rompe ningún uso legítimo dentro del mismo recurso. Se aplica automáticamente a los 6 puntos de uso existentes.
- Verificado explícitamente y sin cambios necesarios: el agrupamiento adjunto↔evento en el backend usa un filtro `scope = 'incidencia_evento' AND scope_id IN (...)` estricto sin JOIN que mezcle eventos de incidencias distintas; `lastEventoId()` en frontend siempre identifica el evento recién creado gracias al `ORDER BY created_at ASC, id ASC` con desempate por PK autoincremental; `CompactComposerComponent` nunca muta `files` in-place (siempre inmutable vía `filesChange`).
- Pruebas nuevas (`incidencias-panel.component.spec.ts`): cambiar de `scope`/`scopeId` sin destruir la instancia limpia adjuntos/borradores del recurso anterior; borradores de respuesta/comentario indexados por incidencia se limpian igual; acordeón y dialogs pendientes se limpian; dos incidencias nunca comparten adjuntos (indexados por su propio id); un mensaje sin adjuntos nunca hereda archivos de un envío anterior en la misma incidencia; Asociación conserva el composer y puede responder con adjuntos; Asociación no ve ninguna acción administrativa; Administración conserva sus acciones intactas.
- Backend (`ffsj-secretaria-api`, mismo cierre): 10 tests nuevos que fijan por contrato el aislamiento de adjuntos entre dos asociaciones/incidencias/eventos distintos, incluyendo acceso directo por ID/URL denegado (403) y los endpoints reales `GET /adjuntos/:id/download` y `GET /adjuntos/incidencia(_evento)/:id`.
- Validación técnica: `ng build --configuration=development` correcto y suite completa en verde (**361/361**: 353 previos + 8 nuevos). Backend: 788/788 y `openapi:check` correcto.
- Validación manual pendiente: confirmación de Fran en navegador de que (1) Asociación puede responder con adjuntos y (2) el adjunto correcto aparece siempre en el mensaje correcto tras navegar entre varias solicitudes/registros sin cerrar el panel.

## 0.43.1#ESMERALDA — Simplificación de acciones administrativas de Incidencias

> Dentro de una incidencia abierta sobraba un segundo composer permanente ("Motivo para devolver a la asociación...", introducido en `0.42.1#ESMERALDA` junto con el resto de la reestructuración) que convivía con el composer normal de comentarios. Se elimina y `Devolver a asociación` pasa a comportarse igual que `Marcar subsanada`/`Cerrar sin subsanar`: un botón que abre un dialog de confirmación.

- `IncidenciasPanelComponent`: el bloque de administración de una incidencia abierta vuelve a mostrar un único composer (comentarios) seguido de las 3 acciones (`Marcar subsanada`, `Cerrar sin subsanar`, `Devolver a asociación`) en la misma fila compacta. Se retira el segundo `app-compact-composer` de devolución y los campos `devoluciones`/`returnFiles`, ya sin uso.
- `Devolver a asociación` abre un `app-confirm-dialog` propio ("Devolver a la asociación") en vez del composer permanente. Reutiliza el flujo existente (`reabrirIncidencia`) sin cambios de API ni de reglas de negocio.
- `ConfirmDialogComponent` (compartido, ya usado por el dialog de cierre de `0.42.1#ESMERALDA` y por confirmaciones de borrado en Inscripciones/Configuración/Calendario/Formularios) gana `@Input() requireReason`, aditivo y `false` por defecto: cuando es `true`, el botón Confirmar permanece deshabilitado hasta escribir un motivo no vacío. El dialog de devolución lo activa para conservar la obligatoriedad real del motivo (`reabrirIncidencia` sigue exigiéndolo en la API, sin cambios ahí); el de cierre sigue sin activarlo, motivo opcional como en `0.42.1#ESMERALDA`.
- Aplicado en el componente compartido: los 6 puntos de uso de `app-incidencias-panel` (Solicitudes, Registro, Inscripciones, Asociados-Gestión ×2) heredan el cambio automáticamente, sin parche específico de ningún módulo.
- Sin cambios en `Marcar subsanada`/`Cerrar sin subsanar` (dialog con motivo opcional) ni en comentarios/adjuntos del composer normal.
- Validación técnica: `ng build --configuration=development` correcto y suite completa en verde (353/353: 345 previos + 4 tests nuevos sobre el dialog de devolución en `incidencias-panel.component.spec.ts` y 4 sobre `requireReason` en `confirm-dialog.component.spec.ts`).
- Validación visual en navegador contra el layout esperado: pendiente de que Fran la realice manualmente.

## 0.43.0#ESMERALDA — Nuevo detalle de Inscripciones para asociaciones e integración de Incidencias

> El detalle de una inscripción ya presentada por Asociación deja de ser una sección plana de página completa (`associationMode === 'view'`, un `<dl>` de texto) y pasa a reutilizar tal cual el dialog con pestañas que Administración ya tenía desde `0.41.0#ESMERALDA` (mismo `entradaDetalleDialogOpen`/`selectedEntrada`, mismas 5 pestañas Información/Participantes/Documentación/Historial/Incidencias), adaptando solo permisos y acciones por rol — no una segunda implementación. Corrige además un IDOR real en la API de Incidencias (ver `ffsj-secretaria-api` `0.43.0#ESMERALDA`): sin ese fix, aunque el frontend mostrara la pestaña, la asociación no podía leer ni responder sus propias incidencias.

- **Arquitectura**: `abrirDetalleEntrada()` (antes solo invocada por Administración desde "Ver detalle") se invoca ahora también al recuperar la entrada de Asociación (`cargarMiEntrada`), al revisar el paso 4 del asistente y al cancelar una edición — las tres transiciones que antes ponían `associationMode = 'view'`. Se elimina la sección plana `summary-panel` de `associationMode === 'view'`, ya sin uso.
- **Incidencias visibles para Asociación**: la pestaña `Incidencias` del dialog ya usaba `<app-incidencias-panel scope="inscripcion" [scopeId]="entrada.id">` sin cambios de contrato — al abrirse ahora también para Asociación, hereda automáticamente acordeón, composer compacto y dialog de cierre de `0.42.x`. La asociación solo ve las acciones de lectura/respuesta (`canAssociationRespond` en `IncidenciasPanelComponent`, sin cambios); `Marcar subsanada`/`Cerrar sin subsanar`/`Devolver a asociación` siguen exclusivas de Administración.
- **Autorización real**: corregido en `ffsj-secretaria-api` (no en el frontend) — ver su propio CHANGELOG. Sin ese fix de backend, ocultar/mostrar la pestaña en el cliente no habría sido suficiente.
- **Cabecera y acciones**: Excel/PDF (exportación masiva de todos los inscritos) quedan exclusivos de Administración (`*ngIf="isAdminMode"`); Asociación ve en su lugar "Justificante PDF" (`descargarJustificanteEntrada`, acción ya existente, antes solo disponible justo tras presentar la inscripción). "Imprimir" (`imprimirEntrada`, impresión de esa única entrada) se mantiene para ambos roles.
- **Estado "Con incidencias"**: sin crear una segunda fuente de verdad — la API ya calculaba `entrada_estado` por formulario en `listInscripciones` pero el frontend no lo tipaba ni usaba; se añade `entradaEstado` al modelo `InscripcionSecretaria` y se muestra como badge (`app-estado-badge`, reutilizado) en el listado de Asociación. En el tab `Información` se añade un aviso con botón "Ir a Incidencias" y en el panel lateral un aviso equivalente "Ver en Incidencias", ambos activando la pestaña directamente (`activarPestanaEntradaDetalle('incidencias')`); en Administración el panel lateral conserva el selector de estado y las acciones de retirada.
- **Documentación**: la Asociación conserva la consulta/descarga de adjuntos ya existentes; el control para añadir documentación nueva a una entrada ya presentada queda exclusivo de Administración (Asociación no disponía de esa acción antes de esta versión — no se inventa).
- **Historial**: se reutiliza sin cambios ni filtrado adicional — se revisaron todos los `tipo` de evento reales (`ACTUALIZADA`, `ESTADO`, `RETIRADA_SOLICITADA`, `RETIRADA_APROBADA`, `RETIRADA_RECHAZADA`, `INCIDENCIA`) y el actor siempre es `'administracion'`/`'asociacion'` genérico, nunca un usuario interno ni datos técnicos.
- **Categoría**: campo añadido al panel lateral (admin y asociación) derivado de `tiposPermitidos` real de la inscripción (`categoriaLabel()`), sin inventar un campo nuevo en el modelo.
- **Navegación**: cerrar el dialog en Administración solo oculta el overlay (el listado de "Inscritos" ya estaba montado detrás, sin cambios); en Asociación, donde el dialog sustituye por completo a la antigua sección plana, cerrar navega a `/inscripciones` reutilizando `volverAlListado()` (conserva búsqueda/filtro/orden/página ya existentes). Deep link `/inscripciones/:id` sin cambios.
- **RUBI**: `syncRubiScreenContext()` añade, solo mientras el dialog está abierto, `entradaId`/`entradaDetalleTab`/`entradaEstado`/`entradaConIncidencias` — nunca datos del formulario ni de otros participantes. Ninguna capability, permiso ni tool ampliados.
- Validación técnica: `ng build --configuration=development` correcto y suite completa en verde (345/345, incluye 6 tests nuevos sobre apertura del dialog, navegación al cerrar según rol, cierre de dialog al modificar, `categoriaLabel` y el nuevo estado expuesto a RUBI).
- Validación visual en navegador contra el mock: pendiente de que Fran la realice manualmente con sesión de asociación real (dialog, acordeón de incidencias, aviso "Con incidencias", responsive).

## 0.42.1#ESMERALDA — Incidencias conversacionales con acordeón y cierre guiado

> Evoluciona el componente común de Incidencias introducido en `0.42.0#ESMERALDA` (misma implementación, sin crear una segunda en paralelo) para cuando ya existe interacción posterior: agrupa varias incidencias por elemento en un acordeón, elimina la duplicación visual del mensaje inicial, reubica las acciones de cierre bajo el composer de comentarios y sustituye el motivo de cierre inline por un dialog de confirmación. La API ya soportaba varias incidencias por `scope`/`scopeId` (`getIncidencias` siempre devolvía un array) y ya aceptaba un motivo de cierre opcional (`cerrarIncidencia` usa `COALESCE`, sin exigirlo) — no ha sido necesario ningún cambio de backend ni migración.

- Cabecera: junto al contador ("N abierta(s)") se añade un botón `+` (`aria-label`/`title` "Crear nueva incidencia") que muestra/oculta el composer de creación bajo demanda; con la lista vacía el composer sigue visible sin necesidad de pulsarlo, igual que antes.
- Cada incidencia se representa como una fila resumen (estado, fecha/hora, preview de una línea del mensaje inicial, chevron) que expande/contrae de forma independiente al pulsarla; la más reciente (la API ya ordena por `fecha_alta DESC`) se expande automáticamente al cargar, sin forzar el resto.
- **Duplicidad eliminada**: el backend siempre registra el mensaje inicial también como el primer evento (`tipo: 'creada'`) de la incidencia. Antes se mostraba dos veces (como párrafo de resumen y de nuevo como primer elemento del hilo); ahora el resumen de la fila lo cubre y el hilo expandido (`conversacion()`) omite ese primer evento cuando es de creación, mostrando solo la conversación real posterior.
- El composer de comentarios de administración se mantiene compacto dentro de la incidencia expandida; justo debajo aparecen `Marcar subsanada` y `Cerrar sin subsanar`, ya sin el bloque grande de textarea + adjuntos + botones que ocupaba antes.
- Nuevo dialog de cierre: se extiende `ConfirmDialogComponent` (compartido, ya usado en Inscripciones/Configuración/Calendario/Formularios) con un campo de motivo opcional (`showReasonField`, contador de caracteres) en vez de crear un dialog paralelo; pulsar cualquiera de las dos acciones abre el mismo dialog y solo cambia el tipo de cierre aplicado al confirmar. Cancelar no aplica ningún cambio.
- "Devolver a asociación" (estado `respondida`) se mantiene como acción aparte, ahora con el mismo composer compacto; el motivo sigue siendo obligatorio para esta acción concreta porque así lo exige la API (`reabrirIncidencia` responde 400 sin motivo) — no se ha relajado esa regla, solo la de los dos cierres nuevos, que la API ya trataba como opcional.
- Al tratarse de una evolución in-place del mismo componente compartido (`app-incidencias-panel`, mismo `@Input`/`@Output`), los 6 puntos de uso existentes (Solicitudes, Registro, Inscripciones, Asociados-Gestión ×2) heredan el acordeón, el botón `+` y el dialog de cierre sin ningún cambio adicional por módulo.
- Validación técnica: `ng build --configuration=development` correcto y suite completa de tests en verde (339/339: 323 previos + 11 nuevos en `incidencias-panel.component.spec.ts` sobre eliminación de duplicidad, acordeón, expansión automática, composer de nueva incidencia y flujo del dialog de cierre + 5 nuevos en `confirm-dialog.component.spec.ts` sobre el campo de motivo opcional). Validación visual en navegador contra los mockups: pendiente de que Fran la realice manualmente con sesión autenticada y datos reales.

## 0.42.0#ESMERALDA — Sistema unificado de Incidencias y composer compacto

> Auditoría previa: Incidencias ya contaba con un componente compartido (`IncidenciasPanelComponent` / `app-incidencias-panel`) reutilizado en 6 puntos (Solicitudes, Registro/Comunicaciones, Inscripciones y Asociados-Gestión ×2 contextos) — no existían implementaciones duplicadas de la entidad `Incidencia`. Ese propio componente compartido concentraba, sin embargo, 4 mini-formularios con `<textarea>` grande, `<input type="file">` de ancho completo y botón de texto. Esta versión refactoriza ese componente existente (no crea uno nuevo) y extrae un `CompactComposerComponent` reutilizable que también adopta el cuadro "Responder en esta conversación" de Registro/Comunicaciones. Sin cambios de API, permisos ni reglas de negocio de Incidencias.

- Nuevo `app-compact-composer` (`src/app/shared/compact-composer.component.ts`), agnóstico de dominio: textarea compacto con auto-crecimiento (hasta 160px con scroll interno), botón de clip que abre el mismo `<input type="file">` de siempre, chips compactos de archivos seleccionados con opción de quitar antes de enviar, botón de envío iconográfico (`bi-send`) con estado de carga, y validación discreta de cantidad/tamaño máximo. Los tres controles solo-icono llevan `aria-label`/`title`.
- `IncidenciasPanelComponent` sustituye, en sus 6 puntos de uso existentes (sin cambios en su contrato público `@Input scope/scopeId` / `@Output countChange`), los formularios de crear incidencia, responder (asociación) y comentar (administración) por el nuevo composer; el bloque de resolución (3 acciones distintas: marcar subsanada / cerrar sin subsanar / devolver) conserva sus 3 botones propios pero sustituye el `<input type="file">` crudo por `app-adjuntos-selector`.
- Cabecera compacta ("Incidencias" + contador "N abierta(s)" / "0"), listado con badge de estado por incidencia y badge de actor (Administración/Asociación/Sistema) por evento, y estado vacío compacto con icono — sustituyendo el bloque de texto disperso anterior.
- El cuadro "Responder en esta conversación" de Registro/Comunicaciones adopta el mismo `app-compact-composer`, reutilizando sin cambios `responderComunicacion()`, `respuestaAdjuntos` y `submittingComm`; "Cerrar comunicación" se mantiene como acción independiente junto al composer.
- Fuera de alcance, detectado en la auditoría y documentado (no migrado): el sistema de tickets "Soporte" (`SoporteIncidencia`, endpoints propios `/soporte/...`) y el flujo "Pedir información" sobre propuestas de actividad en Calendario son conceptualmente similares pero tienen un contrato de datos real distinto (sin `scope`/`scopeId`, sin el modelo `Incidencia`/`IncidenciaEvento`); no se fuerza su migración al componente común, tal como permite el propio roadmap para diferencias reales de contrato.
- Diferencias señaladas frente al mock aprobado: (1) no se implementa el patrón "últimos elementos + enlace 'Ver historial completo'/'Ver toda la conversación'": el alcance escrito no pide truncar el listado y exige conservar toda la información ya disponible, así que se mantiene el listado completo. (2) no se añade el botón secundario "+ Añadir otro archivo": el propio icono de clip del composer ya reabre el selector y fusiona los archivos ya elegidos. (3) las etiquetas de autor mostradas son las reales del modelo (Administración/Asociación/Sistema); el mock mostraba un ejemplo ficticio ("ESCRITOR DÁMASO ALONSO - 27") sin dato equivalente disponible en el componente compartido.
- Validación técnica: `ng build --configuration=development` correcto y suite completa de tests en verde (323/323, incluye 6 tests nuevos en `compact-composer.component.spec.ts` sobre habilitación de envío, límites de archivos y eliminación de adjuntos). Validación visual en navegador contra el mock: pendiente de que Fran la realice manualmente con sesión autenticada y datos reales.

## 0.41.0#ESMERALDA — Refactor de Inscritos: listado avanzado y nuevo detalle en dialog

> Rediseño de `Inscripciones → Inscritos` (listado y detalle). El detalle deja de ser un bloque incrustado bajo la tabla y pasa a un dialog con pestañas, implementado contra el mock visual aprobado (cabecera código/estado/título/asociación, columna principal "Datos de la inscripción" y panel lateral "Estado de la inscripción"). Puramente UX/UI: mismas acciones, mismos endpoints, sin migraciones ni cambios de autorización.

- Listado: ordenación (fecha, número, asociación A-Z/Z-A, estado, responsable), paginación real (10/25/50/100 por página, "X-Y de Z", página actual/total) y filtros compactos (buscador, asociación, estado, "Limpiar filtros") aplicados en ese orden sobre el conjunto ya cargado de la entrada — ver nota.
- Cada fila pasa de una tabla con botones repetidos por columna a una tarjeta compacta (código, estado, asociación, fecha) con "Ver detalle" y un menú `⋮ Acciones` que agrupa Imprimir/Excel/PDF/Aprobar retirada/Rechazar retirada — únicamente acciones que ya existían.
- El detalle se abre en un dialog (`role="dialog"`, mismo patrón de backdrop + tabs ARIA con navegación por flechas/Home/End ya usado en `asociados-gestion` y Registro) sin navegar ni perder filtros/orden/página/búsqueda del listado, que sigue montado detrás.
- Pestañas `Información` (columna principal con cada campo de la inscripción en tarjeta propia con icono, más panel lateral de estado/fecha/última actualización/asociación/código/título/resumen de participantes por tipo), `Participantes` (agrupados por adulto/infantil, ya no como texto plano), `Documentación`, `Historial` e `Incidencias` — estas tres últimas reutilizan exactamente la carga/acciones existentes de adjuntos, eventos e `app-incidencias-panel`.
- El cambio de estado de la entrada (mismo enum y endpoint de siempre) se traslada del listado al panel lateral del detalle, igual que el criterio ya aplicado en Comunicaciones (`0.40.3#ESMERALDA`): una única ubicación editable, sin selector duplicado.
- `EstadoBadgeComponent` gana las etiquetas `retirada_solicitada`/`retirada` (antes caían al texto crudo sin traducir); aditivo, no afecta a los demás usos del badge.
- **Nota sobre ordenación/paginación**: se implementaron en el cliente, no en la API. El nombre de la asociación de cada entrada no vive en `secretaria_inscripcion_entradas` sino que se resuelve por `asociacionId` contra Censo (servicio externo sin join SQL posible), por lo que un `ORDER BY`/`LIMIT` en servidor no podría ordenar ni paginar por asociación de forma correcta sin duplicar ese dato. El listado de entradas de un formulario ya se cargaba completo (sin paginar) desde antes de esta versión; se reutiliza ese mismo dato ya en memoria, igual que el selector de participantes de este mismo componente, en vez de añadir una capacidad de paginación de servidor que no encajaría con el modelo real.
- **Nota sobre el resumen de participantes**: el mock etiqueta el desglose como "Damas infantiles"/"Damas adultas" porque esos son los nombres de los campos configurados en esa inscripción concreta ("Pío XII"); el panel lateral genérico del detalle usa "Infantiles"/"Adultos" (por tipo), ya que esas etiquetas concretas solo existen como texto libre en los campos dinámicos de cada inscripción, no en el modelo de datos.

## 0.40.3#ESMERALDA — Rediseño del detalle de Comunicaciones y nueva pestaña Conversación

> Implementado contra un mock visual aprobado (capturas Información/Conversación), reproducido con alta fidelidad tras validación explícita en navegador a varios anchos. Puramente visual: sin cambios de API, sin tocar la autorización por buzones. Aplica a Documentación y Comunicaciones por compartir el mismo componente; el hilo/pestaña Conversación es exclusivo de Comunicaciones.

- Cabecera con icono, código, selector de estado (único, real — ver nota) y "Marcar como no leído" trasladado desde el contenido.
- `Información` deja de mostrar el hilo completo y el formulario de respuesta: ahora son tarjetas "Resumen", "Participantes" y "Adjuntos iniciales", más un aviso discreto "Esta comunicación tiene un hilo de conversación → Ir a Conversación" cuando existe.
- Nueva pestaña `Conversación` (solo Comunicaciones): mensajes como burbujas con avatar de iniciales, asociación a la izquierda / Administración a la derecha, adjuntos dentro de cada burbuja (icono, nombre, tamaño real, descarga) y el mismo composer de siempre ("Responder en esta conversación", adjuntar, límites reales, botón Responder) reutilizando `responderComunicacion()` sin cambios.
- Panel lateral ampliado con Emisor/Receptor y una sección "Acciones rápidas" con "Imprimir resguardo" (única acción real disponible; ver nota sobre el mock).
- **Nota sobre el estado**: el mock mostraba en la cabecera un valor "CONTESTADA"/"NUEVA" que resulta ser un estado *visual calculado* en el cliente (`estadoVisibleComunicacion`, derivado de quién envió el último mensaje) sin contraparte editable en backend — no es uno de los estados reales (`enviada`, `recibido`, `leido`, `incidencia`, `rechazado`, `finalizada`). Usarlo en un selector habría creado una segunda máquina de estados o un selector que no persiste lo que muestra. Se usa en su lugar el estado administrativo real (`resultado.estado`) como única fuente e interacción, evitando duplicar selectores tal como exige el alcance.
- **Nota sobre "Acciones rápidas"**: el mock mostraba también "Reenviar" y "Eliminar"; no existe backend para ninguna de las dos en Registro, así que no se han implementado (no inventar funcionalidad no existente).

## 0.40.2#ESMERALDA — Rediseño del detalle de Registro con tabs y separación de contenidos

> Rediseño puramente visual del detalle de Registro (Documentación y Comunicaciones): sin cambios de API, sin tocar la autorización por buzones de `0.40.0#ESMERALDA`. Validado en navegador (capturas de escritorio y ancho reducido) además de build y suite de tests completa.

- El detalle deja de mostrar la barra de filtros del listado (`.registro-filters` ahora oculta cuando `isDetailView`) y el botón "Volver" pasa a decir "Volver al listado" en ese contexto.
- Nueva cabecera compacta: código + estado, título, emisor/dirigida a/área/destinatario, fecha de creación y adjunto principal con acceso directo de descarga.
- Contenido reorganizado en tabs accesibles (`role="tablist"`/`"tab"`/`"tabpanel"`, navegación con flechas/Home/End, mismo patrón ya usado en `asociados-gestion`): **Información** (mensaje, adjuntos, marcar no leído, archivar, estado administrativo, hilo de comunicación y respuesta), **Trazabilidad** (eventos como timeline cronológico con icono y etiqueta legible por tipo) e **Incidencias** (`app-incidencias-panel` sin cambios de comportamiento).
- Panel lateral persistente (se apila debajo del contenido en anchos menores a 900px) con estado, código, tipo, año, fecha de creación, última actualización y adjunto principal.
- `IncidenciasPanelComponent` gana un `@Output() countChange` (aditivo, sin romper sus otros 4 usos existentes) para mostrar el contador de incidencias en la pestaña sin duplicar la carga de datos.
- Ninguna funcionalidad perdida: marcar leído/no leído, cambio de estado, archivado, descarga de adjuntos, hilo y respuesta de comunicaciones, e incidencias siguen operando igual que antes, solo reorganizados visualmente.

## 0.40.1#ESMERALDA — Rediseño del listado de Registro y filtros compactos

> Rediseño puramente visual de la pantalla principal de Registro (Documentación y Comunicaciones): sin cambios de API, sin cambios en la autorización por buzones de `0.40.0#ESMERALDA`, sin tocar todavía el detalle (eso es `0.40.2#ESMERALDA`). Validado en navegador (capturas a distintos anchos) además de build y suite de tests completa.

- Barra de filtros compacta en una sola línea principal (buscador, buzón, estado) con "Limpiar filtros" (visible solo cuando hay algún filtro activo) y "Más filtros" para año/orden: en escritorio se ven siempre en la misma línea; en pantallas estrechas "Más filtros" pasa a ser un desplegable real, no decorativo.
- Cada fila de Documentación/Comunicaciones (y la de certificaciones pendientes) se reorganiza en formato tarjeta: código + estado en cabecera, título, y una línea de metadatos con icono (emisor, dirigida a/receptor, área, destinatario, fecha, adjunto principal cuando existe) y una acción "Ver detalle" explícita al final de la fila.
- Corrige un solape real detectado en la propia verificación visual: la etiqueta de estado más larga ("Pendiente de certificación") no envolvía en pantallas estrechas y podía desbordar la fila; ahora envuelve correctamente.
- Sin cambios funcionales: mismos filtros, misma paginación, mismo scope de buzón, misma navegación al detalle — verificado con la suite completa de tests (317/317) y con las capturas de escritorio/tablet/móvil.

## 0.40.0#ESMERALDA — Corrección real del filtrado y autorización por buzones en Registro

> Causa real del fallo reportado ("la API sigue devolviendo todos los registros al filtrar por buzón"): `SecretariaService.getRegistros()` calculaba correctamente `destinatarioId` a partir del selector de buzón de Webmaster, pero no lo incluía en los `HttpParams` de la petición HTTP — se perdía silenciosamente antes de llegar a la API, que respondía (correctamente) con el scope completo del usuario al no recibir ningún filtro. Selector visualmente correcto, filtro real ausente. Sin migraciones ni despliegue.

- `getRegistros()` añade `destinatarioId` a los parámetros de la petición cuando Webmaster tiene un buzón seleccionado; sin selección ("Todos"), sigue sin enviarlo.
- Nuevo `secretaria.service.spec.ts`: fija por contrato HTTP (con `HttpClientTestingModule`) que `destinatarioId` viaja en la query cuando corresponde y que no viaja cuando no hay buzón seleccionado, para que una regresión de este tipo rompa el build en vez de pasar inadvertida.
- No se ha tocado la lógica de autorización de backend (`0.38.0#ESMERALDA`): ya limitaba correctamente el acceso de administradores ordinarios; el problema estaba aislado al envío del filtro desde el frontend.

## 0.39.0#ESMERALDA — Gestión de versión y novedades desde Configuración

> La etiqueta de versión visible en Secretaría deja de estar fija en un componente: ahora lee la release activa publicada por Webmaster desde Configuración. Requiere migración `069_secretaria_release.sql` en `ffsj-secretaria-api`.

- Nueva pestaña "Versión" en Configuración (solo Webmaster): permite crear una versión con novedades en Markdown, guardarla como borrador o publicarla directamente, y publicar cualquier versión anterior ya registrada.
- La cabecera muestra la versión activa junto a un icono de información que abre las novedades (Markdown, renderizado de forma segura); si no hay novedades no se muestra un bloque vacío.
- Si no hay ninguna versión publicada o falla la carga, la aplicación recae automáticamente en la versión técnica derivada de `package.json` (`app-version.ts`, sin cambios) y nunca bloquea ni muestra `undefined`.

## 0.38.0#ESMERALDA — Buzones privados de Registro y gestión de estados

> Registro obtiene de la API los buzones autorizados para la sesión. Webmaster recibe un selector alimentado por esos buzones reales; Administración ordinaria no puede seleccionar ni visualizar buzones ajenos. Sin migraciones ni despliegue.

- Documentación y Comunicaciones recargan listado, filtros, búsqueda, ordenación y paginación al cambiar el buzón de Webmaster.
- El detalle de ambos tipos de Registro muestra el estado actual y permite al administrador autorizado actualizarlo con feedback de guardado; la API valida y audita la transición.

## 0.37.0#ESMERALDA — Validación excepcional de altas históricas de menores

> Administración recibe un aviso al validar excepcionalmente una alta histórica de menor sin representación legal. Desde el detalle selecciona el buzón de Registro y genera una Comunicación predefinida a la asociación; no hay formulario nuevo ni redacción manual. El criterio y la operación se protegen en `ffsj-secretaria-api`. Sin migraciones ni despliegue.

## 0.36.0#ESMERALDA — Control manual del envío tras certificaciones

> El aviso del alta con certificación previa ya no anuncia un envío automático: tras completarse las certificaciones, la asociación puede adjuntar la documentación pendiente y remitir la solicitud manualmente a Secretaría. El cambio de transición se aplica y prueba en `ffsj-secretaria-api`; no hay migraciones ni despliegue.

## 0.34.0#ESMERALDA — Ubicación estructurada y detalle enriquecido de Actividades

> Sustituye el campo libre "Lugar" de Actividades por el mismo selector de ubicación ya usado en "Datos", y reorganiza el detalle en tres pestañas (Información/Ubicación/Documentación) manteniendo la cabecera compacta de 0.33.0#ESMERALDA. **Validación técnica completada** (314/314 pruebas, build `development` OK); **validación manual pendiente**. Sin deploy.

### Ubicación estructurada (reutiliza el selector de "Datos", sin segundo sistema de mapas)

- Creación y edición de Actividad usan ahora `app-location-picker` (el mismo `LocationPickerComponent` — Leaflet + OpenStreetMap/Nominatim, sin API key — que ya usa `asociacion.component.ts` en "Datos") en vez de un `<input>` de texto libre. Cero dependencias nuevas.
- El picker no es un `ControlValueAccessor`; se integra con el mismo patrón getter/setter (`ubicacionCrear`/`ubicacionEditar` + `onUbicacionChange()`) que ya usa `asociacion.component.ts` para su propio selector — no se ha duplicado esa lógica de integración, se ha replicado el patrón ya validado.
- `ActividadSecretaria` gana `lugarLatitud`/`lugarLongitud`/`lugarCodigoPostal`/`lugarLocalidad`/`lugarProvincia` (opcionales). Actividades históricas con solo `lugar` textual siguen funcionando: el picker recibe `latitud`/`longitud` a `null` sin romperse.

### Nuevo detalle por pestañas

- El modal de detalle de actividad pasa a tener tres pestañas: **Información del evento** (descripción Markdown + imagen de portada + inscripciones vinculadas), **Ubicación del evento** (dirección legible + mini mapa) y **Documentación** (adjuntos existentes + alta de nuevos documentos).
- Nuevo `MiniMapComponent` (`app-mini-map`, en `src/app/shared/`): mapa de solo lectura, reutiliza el mismo proveedor (Leaflet + teselas OpenStreetMap) que `LocationPickerComponent` — no es un segundo sistema de mapas, es una variante de presentación sin buscador ni edición. Cuando la actividad no tiene coordenadas (caso histórico), no se muestra ningún mapa y aparece un mensaje de estado vacío claro en su lugar.
- Se mantiene la cabecera compacta de 0.33.0#ESMERALDA (título + chip de estado + fila de metadatos con iconos) por encima de las pestañas.
- El panel lateral (vista compacta) no se ha convertido en pestañas — mantiene su formato resumido de 0.33.0#ESMERALDA y suma un botón "Ver detalle completo" para abrir el modal con las pestañas nuevas.

### Documentación en creación y edición

- El input manual de "Documentación adjunta" del formulario de creación se sustituye por `app-adjuntos-selector` (componente ya existente, usado en Registro/Soporte/Rubi-registro) — no se ha creado un segundo selector de adjuntos.
- Nueva capacidad: administración puede añadir documentación a una actividad ya creada desde la pestaña "Documentación" del detalle (antes solo era posible al crearla), reutilizando el mismo endpoint/scope `'actividad'`. Respeta permisos (`inscripciones:write` + modo administración), límites (10 MB, máx. 5 archivos) y tipos permitidos ya establecidos.

### Compatibilidad RUBI

Sin cambios en este repositorio: RUBI no tiene ningún componente de mapas ni de UI; la exposición de `location` (latitud/longitud) vive enteramente en `ffsj-secretaria-api` (ver su CHANGELOG).

### Pruebas nuevas

`calendario.component.spec.ts`: ubicación estructurada en el selector (con y sin coordenadas), persistencia en creación/edición, las tres pestañas y su contenido, mini mapa con y sin coordenadas (estado de fallback), permisos de subida de documentación (admin con/sin permiso de escritura, asociación), adjuntos existentes (imágenes y documentos) con descarga, imagen de portada en la pestaña Información, y compatibilidad del payload enviado al crear. `mini-map.component.spec.ts`: no se rompe sin coordenadas, inicializa el mapa con coordenadas, actualiza el punto al cambiar el `@Input`.

## 0.33.0#ESMERALDA — Experiencia de edición y lectura de Actividades

> Mejora la creación/edición de Actividades con un editor Markdown para la descripción, y rediseña de forma compacta las dos vistas de detalle (panel lateral y modal), sin tocar el flujo funcional. **Validación técnica completada** (296/296 pruebas, build `development` OK); **validación manual pendiente**. Sin deploy.

### Descripción con Markdown

- El campo "Descripción" de creación/edición de Actividad pasa de `<textarea>` a `app-markdown-editor` (el mismo componente ya introducido en 0.30.0#ESMERALDA para las instrucciones de Inscripciones) — no se ha creado ningún editor ni dependencia nueva.
- El detalle (panel lateral, modal de detalle de actividad y modal de detalle de propuesta) renderiza la descripción con el pipe `markdown` ya existente, de forma segura (saneador HTML de Angular).
- Actividades con descripción guardada como texto plano (todas las existentes hasta ahora) se siguen mostrando correctamente: el pipe `markdown` trata el texto plano como un único párrafo.

### Rediseño compacto del detalle de Actividad

- Se elimina el texto redundante "Detalle de actividad" del panel lateral y del modal de detalle.
- El título y el chip de estado comparten ahora la misma cabecera (`.activity-header`), alineados en la misma línea.
- Fecha/hora, lugar y responsable se agrupan en una sola fila de metadatos (`.activity-meta`) con iconos de Bootstrap Icons ya usados en el resto de la aplicación (`bi-clock`, `bi-geo-alt`, `bi-person` — sin iconos ni dependencias nuevas), que en pantallas estrechas (≤480px) pasan a apilarse verticalmente sin perder jerarquía visual.
- El modal de detalle de propuesta también renderiza su descripción con el pipe `markdown`, por consistencia (mismo campo de datos), sin tocar su cabecera ni su disposición general.
- Sin tabs, sin mapa, sin selector de ubicación ni gestión documental nueva — eso corresponde a `0.34.0#ESMERALDA`.

### Pruebas nuevas (`calendario.component.spec.ts`)

Persistencia de la descripción Markdown en creación/edición, renderizado seguro en las dos vistas de detalle (incluye un intento de XSS vía `<script>`, eliminado por el saneador), compatibilidad con descripciones antiguas en texto plano, ausencia de bloque vacío sin descripción, desaparición del texto "Detalle de actividad", título y chip en la misma cabecera, y presencia de los tres iconos de metadatos con su contenido.

## 0.31.0#ESMERALDA — Horarios y lugar de actividades

> Corrige el desfase horario (~2h) del calendario de Actividades y añade `lugar` (texto libre, opcional). El grueso del hallazgo de causa raíz vive en `ffsj-secretaria-api` (ver su CHANGELOG); este repositorio deja de reconvertir la hora usando la zona del navegador y muestra siempre la hora local de Madrid. **Validación técnica completada** (286/286 pruebas, build `development` OK); **validación manual pendiente**. Sin deploy.

### Corrección del desfase horario

- **Nueva utilidad `src/app/shared/madrid-time.util.ts`** (sin dependencias nuevas, usa `Intl.DateTimeFormat` con `timeZone: 'Europe/Madrid'`): sustituye la lógica anterior de `calendario.component.ts` que reconvertía la hora recibida usando `date.getTimezoneOffset()` del navegador — precisamente el punto donde se materializaba el "+2h" visible, sobre todo si quien mira la pantalla no está en la zona de Madrid.
  - `toMadridDateTimeInputValue()`: rellena los `<input type="datetime-local">` de crear/editar con la hora local de Madrid, no la del navegador.
  - `madridDateOnly()`: determina en qué día del calendario cae una actividad según Madrid, no según UTC ni el navegador (corrige también un desplazamiento de día posible de madrugada).
  - `formatMadridDate()` / pipe `madridDate` (`src/app/shared/madrid-date.pipe.ts`): sustituye al pipe `date` de Angular en las 5 vistas que mostraban `fechaInicio`/`fechaFin` de una actividad — el pipe `date` de Angular no es DST-aware (su parámetro `timezone` no admite zonas IANA como `Europe/Madrid`, solo offsets fijos).
- Al crear/editar, el `<input type="datetime-local">` sigue enviando el mismo valor naive de siempre (sin cambios): el contrato temporal completo se resuelve en `ffsj-secretaria-api`.
- Pruebas de regresión (`madrid-time.util.spec.ts`, `calendario.component.spec.ts`): verano, invierno, y una actividad de madrugada que cambia de día entre UTC y Madrid, comprobando que el calendario la coloca en el día correcto.

### Lugar de la actividad

- `ActividadSecretaria.lugar` (nuevo campo opcional) en `core/models.ts`.
- Nuevo campo de texto "Lugar" en los formularios de creación y gestión de `calendario.component`, junto a las fechas (patrón igual al de "Responsable": texto simple, sin editor enriquecido).
- Se muestra en el detalle lateral, en el modal de detalle de actividad, en el listado de propuestas y en el modal de detalle de propuesta — solo cuando tiene contenido; sin placeholder cuando está vacío.
- Actividades existentes sin lugar mantienen su comportamiento actual.

## 0.30.0#ESMERALDA — Contexto e instrucciones de Inscripciones

> Permite a Administración añadir a cada Inscripción un contexto/instrucciones opcional en Markdown (requisitos, documentación necesaria, observaciones) para la asociación. El campo (`informacion`) ya existía y se persistía en `ffsj-secretaria-api` (ver su CHANGELOG); esta versión aporta el editor Markdown grande y el renderizado seguro, ninguno de los cuales existía en el proyecto. **Validación técnica completada** (274/274 pruebas, build `development` OK); **validación manual pendiente**. Sin deploy.

- **Nuevo editor Markdown reutilizable** (`src/app/shared/markdown-editor.component.ts`, `app-markdown-editor`): `ControlValueAccessor` estándar (funciona con `formControlName` igual que un input nativo), con pestañas "Editar"/"Vista previa" y ayuda de sintaxis. No existía ningún editor Markdown en el proyecto; se ha creado en lugar de asumir que había uno que reutilizar.
- **Nuevo pipe `markdown`** (`src/app/shared/markdown.pipe.ts`, usa `marked`, única dependencia nueva): convierte Markdown a HTML como *string* plano, para que el saneador HTML de Angular lo sanitice automáticamente al enlazarlo vía `[innerHTML]` (sin necesidad de `DomSanitizer.bypassSecurityTrustHtml` ni de una segunda librería de sanitizado).
- **Inscripciones — Administración**: el campo "Información general" (`<textarea>`) de los formularios de creación y de gestión se sustituye por el nuevo editor Markdown, etiquetado como instrucciones para la asociación. Se puede editar en cualquier momento posterior desde el paso de Gestión.
- **Inscripciones — Asociación**: cuando la inscripción tiene instrucciones, se muestran renderizadas como Markdown (de forma segura) en un bloque destacado "Instrucciones de la inscripción", antes de las pestañas de documentación/formulario/participantes. Cuando no hay contenido, no se muestra ningún bloque (compatibilidad con inscripciones existentes).
- Pruebas nuevas: `markdown.pipe.spec.ts`, `markdown-editor.component.spec.ts` (incluye un caso de intento de XSS vía `<script>`, que queda eliminado por el saneador de Angular) e incorporaciones en `inscripciones.component.spec.ts` (creación con instrucciones, edición posterior, inscripción sin instrucciones, renderizado seguro antes del contenido operativo).

## Integración de RUBI v2 en `main` y Dark Launch (post-cierre de 1.12.0#RUBI)

> `develop` (con RUBI 1.9.0→1.12.0 íntegro) se ha integrado en `main` mediante `merge --no-ff`. `main` no tenía ningún commit propio no contenido ya en `develop`, así que el merge fue automático, sin conflictos. El grueso de esta operación (migraciones de base de datos, dark launch) vive en `ffsj-secretaria-api`; ver su CHANGELOG para el detalle completo. No se ha desplegado código a ningún entorno; el deploy de frontend/API sigue siendo manual y pendiente.

- `main` build `production` correcto (263/263 pruebas), `git diff --check` limpio.
- Sin cambios de código en este repositorio: la integración fue puramente de control de versiones (merge de `develop`).

## 1.12.0#RUBI — Conversational Quality & Model Evaluation

> Cuarta versión de RUBI v2 (ver `roadmap/RUBI-v2.md`): el grueso del trabajo (banco de evaluación, comparación de modelos, capa de redacción natural) vive en `ffsj-secretaria-api` (ver su CHANGELOG). Este repositorio aporta la superficie administrativa para incorporar los resultados de un benchmark controlado como evidencia de una sugerencia. **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones, sin Azure, sin producción, sin activación real de ningún proveedor/modelo nuevo.

### Ficha de sugerencia: "Evidencia de benchmark" (8.7)

- Nueva sección en la ficha de sugerencia (Configuración → Rubi → Sugerencias): muestra el modelo base y el candidato comparados, la métrica y sus valores, la variación de coste estimada y notas breves, cuando existen; en caso contrario, un mensaje explícito de que todavía no se ha adjuntado ningún benchmark.
- Nuevo formulario "Adjuntar evidencia de benchmark": siempre una acción administrativa explícita — el benchmark se ejecuta antes y aparte, en local (`npm run rubi:eval:matrix` en `ffsj-secretaria-api`); esta pantalla solo adjunta el resumen ya calculado, nunca dispara un proveedor ni cambia el estado o la prioridad de la sugerencia. El envío exige los 4 campos de identidad (proveedor/modelo base y candidato) y la métrica; el resto son opcionales.
- `RubiAdminService` gana `RubiBenchmarkEvidence`/`RubiBenchmarkParticipant` (tipos) y `attachSuggestionBenchmark()` (`PUT /admin/rubi/sugerencias/{id}/benchmark`); `RubiSuggestion.benchmarkEvidence` refleja exactamente el contrato nuevo del backend.

### Contrato y pruebas

- 263/263 pruebas de frontend (5 nuevas en `rubi-admin.component.spec.ts` para la sección de benchmark), build `development` correcto, `git diff --check` limpio.

## 1.11.0#RUBI — Improvement Suggestions

> Tercera versión de RUBI v2 (ver `roadmap/RUBI-v2.md`): Configuración → Rubi → Sugerencias deja de ser un stub deshabilitado y pasa a mostrar el catálogo real de sugerencias detectadas de forma determinista, con su ficha completa y las acciones administrativas del ciclo de vida. El grueso del cálculo (detectores, prioridad/confianza, persistencia) vive en `ffsj-secretaria-api` (ver su CHANGELOG). **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones, sin Azure, sin producción, sin cambios automáticos de configuración.

### Sección "Sugerencias" funcional (sustituye el stub de 1.10.0#RUBI)

- Tabla (7.6 del roadmap): Estado | Sugerencia | Evidencia | Prioridad | Confianza, con filtro Abiertas/Descartadas/Cerradas y botón "Analizar ahora" (dispara el análisis bajo demanda; nunca automático).
- Ficha de sugerencia (7.7): qué ha detectado, por qué (muestra, veces detectada), comparación (actual vs. periodo anterior), medición posterior cuando existe (antes/después/cambio, con el texto explícito de que es coincidencia temporal, no causalidad), qué propone, impacto esperado (marcado como hipótesis) y las acciones administrativas.
- Las acciones (Marcar en revisión / Aceptar / Descartar / Marcar implementada / Cerrar) se generan siempre a partir de `allowedTransitions` que devuelve el backend: el frontend nunca inventa una transición de estado. Descartar exige un motivo no vacío antes de habilitar el botón.
- `RubiAdminService` gana los tipos (`RubiSuggestion`, `RubiSuggestionStatus`, etc.) y los 4 métodos HTTP correspondientes; `RubiAdminFeedbackSummary` gana `motivoPorSource` (necesario para el detector de modelo del backend).

### Contrato y pruebas

- 258/258 pruebas de frontend (9 nuevas en `rubi-admin.component.spec.ts`, sustituyendo el test del stub deshabilitado de 1.10.0#RUBI), build `development` correcto, `git diff --check` limpio.

## 1.10.0#RUBI — Product Analytics

> Segunda versión de RUBI v2 (ver `roadmap/RUBI-v2.md`): convierte los eventos de 1.9.0#RUBI en analítica comprensible para Administración. La mayor parte del trabajo vive en `ffsj-secretaria-api` (ver su CHANGELOG); este repositorio aporta la nueva sección de Analytics en Configuración → Rubi, el stub de Sugerencias y `metadata.source`/`source` de feedback de punta a punta. **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones, sin Azure, sin producción, sin Gemini real.

### Configuración → Rubi: sección "Analytics" ampliada y stub "Sugerencias"

- La sección de Analíticas ya existente (7/30 días, filtro por asociación) gana: funnel por workflow con números absolutos y porcentajes; analytics conversacional por intent/tool/source; desglose de motivos del 👎 por intent/tool/flow; métricas de calidad (siempre con su muestra `n` visible, nunca una tasa sola); tendencias frente al periodo inmediatamente anterior, con ambos valores absolutos junto al delta. Un mensaje explícito ("todavía no hay datos suficientes") sustituye a una tabla vacía sin explicación.
- Nueva sección "Sugerencias" (6.1 de roadmap/RUBI-v2.md), deshabilitada con el mensaje exacto del roadmap: no se fabrica ninguna sugerencia en esta versión (eso es 1.11.0#RUBI).
- `RubiAdminService`/`RubiAdminAnalytics` (tipos TS) se extienden con `flujos`, `feedback` ampliado, `conversacional`, `calidad` y `comparacionPeriodoAnterior`, reflejando exactamente el contrato nuevo del backend.

### `metadata.source` de punta a punta

- `RubiMessage` guarda `source` (`deterministic`/`provider`) de la respuesta que representa; `RubiPanelComponent.submitFeedback()` lo incluye en el feedback cuando está disponible, permitiendo comparar satisfacción por source en el panel de administración. Nunca se expone el nombre real del proveedor de IA, solo si fue determinista o no.

### Contrato y pruebas

- 251/251 pruebas de frontend (8 nuevas: 6 en `rubi-admin.component.spec.ts` para las secciones nuevas y el stub de Sugerencias, 2 en `rubi-panel.component.spec.ts` para `metadata.source`/feedback), build `development` correcto, `git diff --check` limpio.

## 1.9.0#RUBI — Pilot Instrumentation

> Primera versión de RUBI v2 (ver `roadmap/RUBI-v2.md`): instrumentación necesaria para que el piloto produzca información fiable. La mayor parte de esta versión vive en `ffsj-secretaria-api` (ver su CHANGELOG); este repositorio aporta la distinción real cancelado/caducado/derivado-a-flujo-normal en el tracking de eventos y el selector de motivo del 👎. **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones, sin Azure, sin producción, sin Gemini real.

### El feedback negativo ahora deja elegir el motivo real (antes se fijaba siempre a "no útil")

- `rubi-panel.component.ts`/`.html`: al pulsar 👎 se muestra un selector con las 4 opciones ya soportadas por el backend (`incorrect`/`not_understood`/`not_useful`/`technical_issue`, i18n ES/VA/EN) en vez de enviar el feedback de inmediato con un motivo fijo. El feedback también incluye ahora el `flow` activo (alta/modificación/baja/documentación/comunicación) cuando hay un workflow de Rubi abierto en ese momento.
- `RubiApiService.feedback()` deja de forzar `reason: 'not_useful'`; el motivo (y el `flow`) los decide quien llama.

### Distinción real entre cancelado, caducado y derivado al flujo normal

- Causa: `onAltaClosed`/`onModificacionClosed`/`onBajaClosed`/`onRegistroClosed` reportaban siempre `flow_cancelled` al backend, incluso cuando el motivo real era `'expired'` (la preparación caducó) — la métrica "expirados" del funnel (roadmap/RUBI-v2.md 5.1/5.2) era imposible de calcular con ese dato. Además, usar el botón "usar el flujo normal" (`openNormalAltaFlow()` y equivalentes) no se reportaba en absoluto.
- Corrección: se reporta `flow_expired` cuando el motivo es `'expired'` (nunca ya `flow_cancelled` en ese caso), y `flow_redirected` al elegir el flujo normal existente. Ver `ffsj-secretaria-api` para cómo se persiste y se calcula el funnel a partir de estos eventos.

### Contrato y pruebas

- 243/243 pruebas de frontend (10 nuevas en `rubi-panel.component.spec.ts`, 1 actualizada en `rubi-api.service.spec.ts` para reflejar que el motivo ya no es fijo), build `development` correcto, `git diff --check` limpio.
- Privacidad sin cambios: el feedback nunca incluye el texto del mensaje ni de la respuesta (verificado en test), solo la clasificación estructurada ya existente más el motivo elegido.

## fix/rubi-normal-form-visibility — corrige la visibilidad real del formulario de Altas (INTEGRADA en develop, merge `--no-ff`)

> Bug real detectado en la validación manual en DEV sobre el fix anterior (`fix/rubi-normal-form-diagnostics`): la validación seguía fallando. **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones, sin Azure, sin producción, sin Gemini real. No requiere cambios en la API.

### Bug real: entrar a `/asociados/gestion` sin `?tab=altas` seguía sin publicar `formDiagnostics`

- Causa: `mostrarFormMod` no representa "hay un formulario visible" — la plantilla solo la usa para condicionar el formulario de Modificación. El de Altas se muestra siempre que no se esté viendo el listado de pendientes, sin comprobar `mostrarFormMod` en ningún momento. Como `mostrarFormMod` solo se ponía a `true` dentro del bloque que procesa el query param `?tab=altas`, la navegación normal (sin ese parámetro) dejaba el formulario de Altas visible en pantalla pero `currentFormDiagnostics()` devolvía `undefined`.
- Corrección: nuevo `isCurrentFormVisible()`, fuente de verdad única que replica las condiciones reales de la plantilla por pestaña (Altas: `!estaViendoPendientes('alta')`; Modificaciones: `!estaViendoPendientes('cambio') && mostrarFormMod`), sustituye el guard antiguo basado solo en `mostrarFormMod`.
- `abrirPendientes()`/`volverDesdePendientes()` ahora llaman a `syncRubiScreenContext()` de inmediato (antes podían dejar un `formDiagnostics` obsoleto o ausente al alternar entre el formulario y el listado de pendientes). Se cubren además dos puntos donde `activeTab` pasaba a `'solicitudes'` sin sincronizar.
- 9 tests nuevos (`asociados-gestion.component.spec.ts`) que reproducen el bug real sin `setTab()`/`patchValue()`/sync manual: entrada sin `?tab=altas` (verificado que falla contra el código anterior), entrada con `?tab=altas` explícito, apertura/cierre de pendientes de Alta y de Modificación, y el payload de regresión completo.

## fix/rubi-normal-form-diagnostics — diagnóstico de formularios normales de Secretaría (INTEGRADA en develop, merge `--no-ff`)

> Corrige un fallo funcional confirmado en la validación manual en DEV: Rubi no sabía diagnosticar formularios normales de Secretaría (fuera del panel de Rubi), solo los workflows embebidos e Inscripciones. **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones ejecutadas, sin Gemini real.

### Bug confirmado: `/asociados/gestion` (Altas) respondía "no veo ningún formulario abierto"

- Causa: `AsociadosGestionComponent.updateRubiScreenContext()` solo publicaba `{ module, view, tab }`, nunca `state.formDiagnostics`; el formulario de alta real (`altaForm`) nunca pasaba por `buildFormDiagnostics()`.
- Corrección: nuevo `syncRubiScreenContext()` (sustituye a `updateRubiScreenContext()`), único punto que construye el contexto completo. Publica `formDiagnostics` solo cuando el formulario está realmente visible (`mostrarFormMod`), suscrito a `altaForm.valueChanges` para reflejar cada tecla sin esperar a cambiar de pestaña. Incluye `extraIssues` para las condiciones reales de `guardarRegistroAltaOCambio()` que no son errores de Angular: cargo obligatorio no seleccionado (`ALTA_CARGO_REQUERIDO`, nuevo), representación legal incompleta para un menor (`ALTA_REPRESENTACION_REQUERIDA`, ya existente) y ejercicio no activo (`ALTA_EJERCICIO_NO_DISPONIBLE`, nuevo).
- Cambiar de pestaña, o de Altas a Modificaciones, limpia el diagnóstico anterior de inmediato (nunca lo arrastra). Labels de campo estáticos (el mismo texto ya visible en la plantilla), sin i18n (este componente no lo usa) y sin scraping del DOM.
- `SoporteComponent` (formulario de nueva incidencia) gana el mismo patrón desde cero (antes sin ningún wiring a Rubi): `syncRubiScreenContext()`, `valueChanges`, y ausencia de diagnóstico mientras se ve el detalle de un ticket existente.
- 17 tests nuevos (`asociados-gestion.component.spec.ts`, `soporte.component.spec.ts`, `rubi-panel.component.spec.ts`), incluido un test de regresión que reproduce el payload real del bug y confirma que ahora incluye `state.formDiagnostics`.

### Bug de contexto: cambio de ejercicio global sin tocar el formulario

- Causa: `accionesBloqueadasPorEjercicio` (y por tanto `ALTA_EJERCICIO_NO_DISPONIBLE`) depende del selector global de ejercicio, pero el componente nunca se suscribía a `EjercicioService.selectedChanges`. Cambiar a un ejercicio histórico sin tocar el formulario ni la pestaña podía dejar un `formDiagnostics` obsoleto hasta el siguiente evento local.
- Corrección: `formDiagnosticsSub` pasa a ser una única bolsa `Subscription` que agrupa `altaForm.valueChanges` y la nueva suscripción a `selectedChanges`; limpieza única en `ngOnDestroy`. Sin llamadas HTTP nuevas.
- 3 tests nuevos con un `EjercicioService` respaldado por un `BehaviorSubject` real: reproducen el caso exacto (emitir un ejercicio no activo por `selectedChanges`, sin `setTab`/`patchValue`/sync manual) más un test de limpieza de la suscripción.

### Lenguaje natural ampliado, sin secuestrar Soporte

- Nuevas frases ES/VA/EN ("no puedo enviar el formulario", "no me deja guardar", "el formulario no funciona"...) reconocidas como pregunta de diagnóstico — ver CHANGELOG de `ffsj-secretaria-api` para el detalle del router determinista. Estas frases se solapan a propósito con la orientación hacia Soporte, así que solo se resuelven como diagnóstico cuando hay un formulario realmente activo; sin él, siguen el routing normal.

### Pendiente (documentado, no incluido en esta rama)

- `RegistroComponent`: ya publica `state.canCreate` pero no `formDiagnostics`; requiere antes auditar su reutilización de componente entre `/registro/documentacion` y `/registro/comunicacion` para no publicar un diagnóstico obsoleto al cambiar de modo sin recrear el componente.
- `AsociacionComponent`: no tiene módulo Rubi asignado hoy; ampliarlo exige un módulo nuevo en `RubiModule` y sus allowlists de backend, fuera de alcance de esta corrección puntual.

### Contrato y pruebas

- 228/228 pruebas de frontend (20 nuevas sobre el cierre de `feat/rubi-form-diagnostics`), build `development` correcto, `git diff --check` limpio. Revalidado desde cero antes y después del merge `--no-ff` a `develop`; `git merge-base --is-ancestor` confirma la rama íntegramente contenida.
- Sin deploy, sin migraciones, sin cambios en Azure ni en producción.

## feat/rubi-form-diagnostics — diagnóstico contextual de formularios (INTEGRADA en develop, merge `--no-ff`)

> Última mejora funcional/UX de Rubi antes del piloto, más dos correcciones UX detectadas en la validación manual post-auditoría (30 pruebas: 29 OK, 1 fallo menor de UX, 0 bloqueadas). **Validación técnica completada; validación manual DEV pendiente.** Sin deploy, sin migraciones ejecutadas, sin Gemini real.

### G — Diagnóstico contextual de formularios

- Rubi ahora puede explicar el estado funcional del formulario activo ("¿qué me falta?", "¿por qué no me deja enviar esto?", reformulaciones equivalentes en ES/VA/EN) a partir de metadatos de validación estructurados, nunca de los valores introducidos por el usuario. Diagnóstico 100% determinista (plantillas locales, sin llamar al provider). Ver `docs/rubi/RUBI.md` para la arquitectura y el contrato completos.
- Nuevo extractor genérico y reutilizable `form-diagnostics.util.ts` (`buildFormDiagnostics`) que traduce el resultado de los validadores de Angular (`required`, `requiredTrue`, `pattern`, `email`, `minlength`/`maxlength`, `min`/`max`, `minItems`/`maxItems`, validadores custom ya usados por Secretaría) a un contrato pequeño (`RubiFormDiagnostics`/`RubiFormDiagnosticIssue`), sin depender de scraping del DOM ni de una nueva biblioteca de formularios.
- Cobertura: formulario dinámico de Inscripciones (`InscripcionesComponent`) y los cuatro workflows Rubi (alta, modificación, baja, documentación/comunicación). Cada uno aporta también, cuando aplica, condiciones de negocio conocidas que bloquean el envío sin ser un error de Angular (participantes insuficientes, adjunto obligatorio, ejercicio no activo, plazo de inscripción cerrado) y códigos funcionales seguros ya devueltos por el backend (`ALTA_CARGO_NO_DISPONIBLE`, `INSCRIPCION_PLAZO_CERRADO`...).
- El diagnóstico se limpia por completo al cambiar de inscripción, de workflow o al cancelarlo; nunca sobrevive al siguiente turno.
- Extiende `RubiScreenContext.state` con `formDiagnostics` (opcional); actualizado el test cerrado de "el contexto nunca incluye PII" (`rubi-panel.component.spec.ts`) para incluir la nueva clave.
- **Corrección (`totalIssues`/`truncated`)**: `issues` sigue capado a 8 (privacidad/tamaño de contexto/tokens), pero `buildFormDiagnostics()` calcula ahora `totalIssues` ANTES de recortar y `truncated = totalIssues > issues.length`. Sin esto, un formulario con 12 errores reales solo enviaba 8, y Rubi podía acabar afirmando "te faltan 8 cosas" cuando en realidad faltaban 12. Ambos campos son solo un recuento (metadata segura, nunca un dato de usuario) y son opcionales para no romper compatibilidad.

### Correcciones UX (validación manual post-auditoría)

- **A-05** — "¿Qué inscripción tengo seleccionada?" con la inscripción ya abierta en pantalla ya no ofrece la acción redundante "Ir a Inscripciones"/"abrir inscripción"; confirma directamente que esa es la inscripción activa. Corrección en backend (`RubiActivityTools.js`); ver CHANGELOG de `ffsj-secretaria-api`.
- **A-06 (launcher sobre el composer)** — el botón flotante "Rubi ¿Te ayudo?" deja de renderizarse mientras el panel está abierto (antes solo dependía de `accessGranted`, ahora también de `!open`), eliminando el solapamiento con la cabecera/composer en cualquier resolución. El panel se sigue cerrando únicamente con la X de la cabecera; al cerrarlo, el launcher reaparece. 2 tests nuevos en `rubi-panel.component.spec.ts`.

### Contrato y pruebas

- 208/208 pruebas de frontend (37 nuevas sobre el cierre anterior), build `development` correcto, `git diff --check` limpio. Revalidado desde cero antes y después del merge `--no-ff` a `develop`; `git merge-base --is-ancestor` confirma la rama íntegramente contenida.
- Sin deploy, sin migraciones, sin cambios en Azure ni en producción.

## fix/rubi-post-auditoria — revisión técnica final (EN DESARROLLO, NO mergeada a develop)

> Última revisión acotada antes de mergear la estabilización A-F. Implementado y validado técnicamente; validación manual pendiente.

### Observabilidad (frente E): contrato de analíticas actualizado

- `/admin/rubi/analiticas` separa ahora `operacion` (peticiones conversacionales reales a Rubi) de `provider` (coste/tokens del proveedor de pago), en vez de una lista plana de campos ambiguos. La sección de analíticas del Centro RUBI muestra ambos bloques con etiquetas explícitas sobre qué mide cada uno.
- 6 tests actualizados/nuevos en `rubi-admin.component.spec.ts`.

### Sin cambios de frontend en los otros dos puntos de esta revisión

- La corrección de `registrationStatus()` y la auditoría de autorización de `Inscripciones.js` son puramente de backend/documentación (ver CHANGELOG de `ffsj-secretaria-api`); no requieren ningún cambio en el frontend.

### Contrato y pruebas

- 171/171 pruebas de frontend, build `development` correcto, `git diff --check` limpio.
- Sin deploy, sin migraciones, sin cambios en Azure ni en producción. No mergeado a `develop`.

## fix/rubi-post-auditoria — EN DESARROLLO (rama correctiva, NO mergeada a develop)

> Estabilización funcional derivada de la campaña manual completa posterior a `1.8.1#RUBI` (97 pruebas: 89 OK, 3 fallo, 5 bloqueadas). Seis frentes funcionales, implementados y validados técnicamente; validación manual pendiente. Sin deploy, sin migraciones ejecutadas, sin piloto activado.

### A — Contexto de pantalla (100-05)

- `HomeComponent`, `RegistroComponent` e `InscripcionesComponent` (listado y detalle) informan ahora a `RubiScreenContextService`; antes solo Calendario y la gestión de asociados lo hacían.
- `InscripcionesComponent` distingue `view: 'listado' | 'detalle'` y expone `selectedInscriptionId` solo en detalle.

### B — Consultas temporales (130-02)

- Sin cambios de frontend (la corrección determinista de ventanas temporales vive en el backend).

### C — Lectura de estado de inscripciones (130-06, 150-03)

- Sin cambios de UI dedicados: la nueva capability se consume igual que el resto de respuestas de Rubi en el chat existente.

### D — Administración de tools (180-03)

- Nueva sección "Tools y capacidades" en Configuración → RUBI (`rubi-admin.component`): catálogo real, descripción, dominio, estado efectivo y toggle de bloqueo administrativo por tool. Una tool bloqueada por infraestructura se muestra con una insignia informativa, sin ningún control que pueda desbloquearla.

### E — Observabilidad (180-07)

- La sección de analíticas del Centro RUBI añade latencia media, distribución por tool, fallos por código y llamadas por asociación, y un filtro por asociación (el backend ya lo soportaba).

### F — Rectificación de workflows (X-02)

- Botón siempre visible "Cancelar trámite y volver al chat" durante alta/modificación/baja/documentación/comunicación. Reutiliza el `cancel()` público que cada componente ya exponía.

### Contrato y pruebas

- 171/171 pruebas de frontend (26 nuevas), build `development` correcto, `git diff --check` limpio.
- Sin deploy, sin migraciones, sin cambios en Azure ni en producción. No mergeado a `develop`.

## 1.8.1#RUBI — CERRADA — Corrección de blocker de validación manual (RUBI-20)

> Hallazgo real durante la validación manual de RUBI-20 en DEV: un usuario Federación/Administración autorizado no veía el selector de asociación objetivo en el panel Rubi, bloqueando 150-06 → 150-10. Corrección de una sola causa, sin funcionalidad nueva de producto. **Validación funcional manual posterior confirmada: 150-05, 150-06, 150-07, 150-08, 150-09, 150-10 y 160-06 OK.**

### Causa raíz

- `isFederationActor` (rubi-panel.component.ts) se calculaba como `!this.censoService.asociacionId`, delegando en `AuthService.getIdAsociacion()` de `ffsj-web-components`. Esa función devuelve `-1` (no `0`) para cualquier login que no sea de asociación, y en JavaScript `!(-1)` es `false`. El selector, por tanto, nunca se mostraba a un actor Federación/Administración real, independientemente de su autorización.
- Decisión arquitectónica corregida: **el frontend ya no infiere el scope**; consume el scope y `canSelectTargetAssociation` resueltos exclusivamente por `GET /asistente/acceso` (ver CHANGELOG de `ffsj-secretaria-api` 1.8.1#RUBI). Ver `docs/rubi/RUBI.md`.

### Cambio frontend

- `RubiApiService.access()` devuelve ahora `{ enabled, authorized, scope, canSelectTargetAssociation }` (interfaz `RubiAccess`).
- `RubiPanelComponent`: eliminado el getter `isFederationActor`; nuevo estado `canSelectTargetAssociation`, poblado desde la respuesta de `/asistente/acceso` en `ngOnInit`. El `<select>` de asociación objetivo (`rubi-panel.component.html`) pasa a condicionarse por este campo.
- Corrección adicional relacionada: el panel Rubi persiste montado entre sesiones (`@defer` en `app.component.html`), así que un `targetAssociationId`/`federationAssociations` cargados por un actor podían sobrevivir a un logout/login posterior en la misma pestaña. Ahora se limpian al cambiar el estado de sesión (`AuthService.loginStatusObservable`).
- `CensoService`/`AuthService.getIdAsociacion()` se mantienen sin cambios: siguen siendo correctos para su uso original (contexto de asociación propia); el bug estaba únicamente en reutilizarlos como señal de "es Federación".

### Contrato y pruebas

- 145/145 pruebas de frontend (2 nuevas), build `development` correcto, `git diff --check` limpio.
- Sin deploy, sin migraciones, sin cambios en Azure ni en producción.

## 1.8.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-23 — Release Candidate / Preparación de piloto: implementado y validado técnicamente. Feature freeze, sin funcionalidades nuevas. Sin deploy, sin piloto activado, validación funcional manual pendiente (sin confirmación del usuario de que se haya realizado).

### Release Candidate — RUBI-23

- Nuevos documentos operativos: `docs/rubi/PILOT.md` (runbook), `docs/rubi/DEPLOY_CHECKLIST.md`, `docs/rubi/SMOKE_TEST.md` (10-20 min), `docs/rubi/REGRESSION_PLAN.md` (RUBI-01 → RUBI-22 por dominio), `docs/rubi/ROLLBACK.md`.
- Matriz de acceso del piloto probada exhaustivamente (32 combinaciones asociación + 32 Federación): autorizado solo si todas las capas lo permiten; modo piloto con allowlist vacía nunca autoriza a nadie.
- Los 4 niveles de kill switch (tool concreta, transacciones, provider real, Rubi completo) demostrados con test dedicado; independientes entre sí.
- Migraciones `055` → `061` reauditadas: orden, idempotencia, defaults seguros. Ninguna nueva necesaria.
- Reanálisis de las 32 vulnerabilidades de dependencias pendientes del frontend, sin aceptar la conclusión previa sin verificar el uso real del código: jsPDF y xlsx clasificadas ACCEPTED RISK (uso real no activa las APIs vulnerables, verificado); Angular core ACCEPTED RISK para un piloto en grupo controlado, DEBT bloqueante antes de una release pública más amplia. Ningún BLOCKER de seguridad pendiente para el piloto.
- Revisión final de privacidad/retención, observabilidad real disponible, control de costes, UX e i18n: sin cambios de comportamiento, solo documentación y verificación.

## 1.7.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-22 — Hardening integral: implementado y validado técnicamente. No añade funcionalidades. Validación funcional manual pendiente de campaña conjunta (se suma a RUBI-17 → RUBI-21).

### Hardening — RUBI-22

- Auditoría activa de bypasses de permisos/scope, prompt/tool injection, privacidad, kill switches, concurrencia y degradación ante fallos del provider. Mapa de superficie: `RubiGateway`, `RubiContext`, `RubiCapabilityResolver`, `RubiToolRegistry`, `RubiDeterministicRouter`, `RubiConversationContext`, `RubiPilotAccess`, `RubiInsightsGateway`, panel Angular.
- `RubiInsightsGateway` no rechazaba parámetros de query no reconocidos en `GET /asistente/sugerencias` (a diferencia de `/asistente/mensaje`). Corregido con el mismo allowlist explícito.
- Nuevo banco adversarial (`rubi.hardening.test.js`, 12 tests): frases de inyección combinadas con un provider que las "obedece" y propone tools/argumentos maliciosos, matriz de kill switches, aislamiento de `associationId`/scope frente a mensaje/argumentos manipulados, seguridad de las acciones de insights. Ningún bypass real encontrado.
- Eval adversarial ampliado con 2 casos nuevos (exigir una tool sin permiso; pedir confirmar sin revisión humana). 112/112.
- `npm audit fix` sin `--force` en ambos repositorios: 7/7 vulnerabilidades resueltas en la API; 40/72 resueltas en el frontend (resto documentado como deuda: bump coordinado de Angular pendiente de pruebas de UI, jsPDF requiere major, xlsx sin fix en origen).
- Sin migraciones. Sin despliegue.

## 1.6.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-21 — Proactividad contextual: implementado y validado técnicamente. Validación funcional manual pendiente de campaña conjunta (se suma a RUBI-17 → RUBI-20).

### Añadido — Proactividad contextual (RUBI-21)

- Nuevo endpoint `GET /asistente/sugerencias`: sugerencias deterministas calculadas en backend (`RubiInsightsService`), nunca decididas por el provider. Reutiliza las tools de lectura ya auditadas (`get_comunicaciones`, `get_calendario`) y los dashboards existentes; no introduce consultas SQL paralelas.
- Dominios: comunicaciones nuevas, plazos de inscripción próximos (ventana fija de 3 días), solicitudes pendientes (asociación propia o, en Federación sin objetivo con permiso, el panel admin). Prioridad fija `acción requerida > plazo próximo > novedad > informativo`.
- Subordinado a permisos/scope/target exactamente igual que el resto de Rubi; aislamiento A→B verificado con test dedicado (mismo patrón que RUBI-20).
- Panel Angular consulta sugerencias al abrir y al cambiar de asociación objetivo; sin polling, sin apertura automática del panel. Cada sugerencia reutiliza `executeAction`/`isSafeAction`; ninguna ejecuta nada por sí sola. Fallo parcial de un dominio no rompe el resto del panel.
- Sin badge en el lanzador (decisión deliberada para no duplicar/confundir la campana `.tasks-bell` existente). Sin tabla ni migración nueva.

### Contrato y pruebas

- 408 pruebas de API (18 nuevas), 143 pruebas de frontend (6 nuevas), build `development`, evaluación Rubi con provider mock (110/110) y contrato OpenAPI (`/asistente/sugerencias`, `RubiInsight`, `RubiSuggestionsResponse`) correctos en ambos repositorios. Sin migraciones ejecutadas.

## 1.5.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-20 — Rubi para Federación / Administración: implementado y validado técnicamente e integrado en `develop`. Validación funcional manual en DEV pendiente; se realizará conjuntamente para RUBI-17, RUBI-18, RUBI-19 y RUBI-20.

### Añadido — Rubi para Federación / Administración (RUBI-20)

- Rubi reconoce un actor Federación/Administración (un cargo autenticado sin asociación propia), además del actor de asociación existente. `admin:access` y `admin:rubi` no conceden ninguna capability funcional por sí solos.
- Nuevo selector estructurado de asociación objetivo en el panel (reutiliza el listado real de Censo ya usado en otras pantallas administrativas); nunca se escribe un id a mano ni se interpreta desde el chat. Cambiar de asociación objetivo limpia la conversación completa.
- Nuevo interruptor en el Centro de administración de Rubi para autorizar el acceso de Federación, independiente de la autorización por asociación.

### Contrato y pruebas

- 137 pruebas de frontend y build `development` correctos.

## 1.4.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-18 — Soporte inteligente y RUBI-19 — Comunicaciones y envíos asistidos: implementados y validados técnicamente. Validación funcional manual en DEV diferida a la campaña conjunta previa al cierre de `1.5.0#RUBI` (cubrirá RUBI-17 → RUBI-20).

### Añadido — Soporte inteligente (RUBI-18)

- Rubi puede orientar sobre un problema y, cuando el usuario lo pide explícitamente, abrir Soporte para crear la incidencia con el formulario real (categoría, asunto, descripción y adjuntos); nunca crea la incidencia, sube adjuntos ni confirma desde el chat.
- Nueva capability `soporte.start` sin permiso asociado (crear una incidencia solo exige sesión autenticada en el sistema real) y tool cerrada `start_soporte` que solo navega a `/soporte`.
- Soporte se integra en la clasificación única de dominios de Rubi; una mención de otro dominio dentro de una frase de problema ("me da un error al inscribirme") se trata como contexto, no como petición de actuar sobre ese dominio.
- El texto de un turno de soporte se abstrae del historial antes de cualquier llamada posterior al proveedor, igual que el resto de dominios sensibles.
- Validación funcional manual en DEV diferida a la campaña conjunta previa al cierre de `1.5.0#RUBI`.

### Contrato y pruebas

- 129 pruebas de frontend y build `development` correctos.

### Añadido — Comunicaciones y envíos asistidos (RUBI-19)

- Rubi puede consultar las comunicaciones reales recibidas de la Federación (cuántas hay, cuáles son nuevas, quién las envía) y abrir la bandeja real de Registro → Comunicación, reutilizando el filtro `bandeja` (nuevas/recibidas/enviadas/contestadas) que el componente ya soportaba.
- No se confunde con RUBI-16 (enviar una comunicación nueva): el plural "comunicaciones" (consultar) tiene prioridad sobre el singular "una comunicación" con verbo de envío (crear).
- Validación funcional manual en DEV diferida a la campaña conjunta previa al cierre de `1.5.0#RUBI`.

### Contrato y pruebas

- 132 pruebas de frontend y build `development` correctos.

## 1.3.0#RUBI — CERRADA TÉCNICAMENTE

> RUBI-17 — Actividades, calendario e inscripciones asistidas: implementado y validado técnicamente. Validación funcional manual en DEV diferida a la campaña conjunta previa al cierre de `1.5.0#RUBI`.

### Añadido — Actividades, calendario e inscripciones asistidas (RUBI-17)

- El panel admite selecciones estructuradas de actividad devueltas por Rubi y abre exclusivamente la ruta registrada del formulario real `/inscripciones/:id`.
- Se conserva el referente allowlisted de actividad/formulario desde la pantalla y la conversación para seguimientos, sin participantes, respuestas ni adjuntos.
- El calendario publica el contexto de la actividad seleccionada; el formulario dinámico, sus validaciones y su confirmación humana siguen siendo los existentes.
- Cobertura frontend del action de inscripción, filtrado de identificadores inseguros y etiquetas estructuradas ES/VA/EN.

### Contrato y pruebas

- 127 pruebas de frontend y build `development` correctos; evaluación Rubi con provider mock validada en la API (104/104 casos ES/VA/EN).

## 1.2.0#RUBI — CERRADA

> RUBI-16 — Registro General y documentación asistidos: completado y validado funcionalmente por el usuario.

### Añadido — Registro General y documentación asistidos (RUBI-16)

- Nuevo componente `rubi-registro` (documentación y comunicación) que sigue el mismo patrón preparar → revisar → confirmar humano de alta/modificación/baja: selección de destinatario, título, mensaje, adjuntos, resumen y confirmación explícita.
- Los adjuntos se seleccionan en el propio formulario (selector ya existente) y se suben aparte, tras confirmar, directamente contra el registro ya real y numerado; si alguno falla, el panel ofrece reintentar solo los pendientes sin perder ni duplicar el registro.
- Documentación exige al menos un archivo adjunto; comunicación los admite como opcionales y respeta el aviso de ejercicio no activo que ya muestra el Registro real.
- `RubiPanelComponent` reconoce las nuevas acciones `documentacion`/`comunicacion` iniciadas por Rubi, con su propio estado de preparación y contexto de pantalla abstraído (nunca título, mensaje ni nombres de archivo).
- Traducciones ES/VA/EN para el nuevo flujo.

### Contrato y pruebas

- 125 pruebas en ChromeHeadless (12 nuevas) y build `development` correcto.

## 1.1.0#RUBI - 2026-09-17

### Añadido — Modificaciones asistidas (RUBI-14)

- Workflow de modificaciones asistidas de personas: selección estructurada, edición de campos permitidos, preparación y revisión antes/después.
- La confirmación humana registra el trámite administrativo mediante la API, con revalidación, cancelación, idempotencia y derivación segura de cambios complejos de cargos al flujo normal.

### Añadido — Bajas asistidas (RUBI-15)

- Baja asistida de personas activas, con selección, carga del estado real (incluidos cargos), motivo opcional, resumen, confirmación humana y derivación de cargos obligatorios al flujo normal.

### Añadido — Centro de administración de Rubi (RUBI-15.1)

- Centro de administración y control de Rubi en Configuración → RUBI (permiso `admin:rubi`): estado global (`enabled`), autorización explícita por asociación (`authorized`, con búsqueda y filtro), estado del provider sin exponer credenciales, presupuesto diario/mensual y una primera vista de analíticas agregadas.
- El acceso `/asistente/acceso` refleja el modelo `enabled`/`authorized`; la allowlist de RUBI-13 queda como modo piloto opcional y ya no restringe el acceso ordinario.

### Corregido — Estabilización conversacional

- Rubi reconoce de forma fiable altas, modificaciones y bajas a partir de lenguaje natural (órdenes directas, correcciones y negaciones como "no quiero un alta, quiero una modificación"), sin que una intención secuestre a otra.
- Se reconocen saludos con vocativo ("Hola Rubi!") y preguntas de capacidades formuladas de distintas maneras, evitando el fallback genérico cuando la intención es reconocible.
- Rubi ya no afirma que no puede iniciar altas, cambios o bajas: puede abrirlos de forma segura cuando el usuario tiene permiso, siempre con confirmación humana en el formulario.

### Documentación

- `docs/rubi/STATUS.md` refleja el cierre de `1.1.0#RUBI` con RUBI-14, RUBI-15 y RUBI-15.1 validados funcionalmente en DEV por el usuario.

## 1.0.0#RUBI - 2026-09-17

### Cerrado

- Se cierra la base funcional de Rubi: Gateway, provider Gemini, conversación contextual multi-turn, contexto de pantalla, navegación, Knowledge Base, scopes/capabilities, límites, budgets, retries y observabilidad.
- Se completa el primer workflow asistido de alta con preparación, confirmación humana, revalidación, idempotencia y registro administrativo real, manteniendo la PII fuera del provider.
- Se incorpora documentación de continuidad entre agentes en `docs/rubi/`.
- La infraestructura segura de piloto queda disponible en código, pero desactivada y sin configuración remota; el piloto se realizará en una fase posterior.

## 0.29.20#ESMERALDA - 2026-09-15

### Corregido

- Al resolver una solicitud de modificación de asociación, Administración cierra el detalle y recarga las pendientes; las solicitudes ya aprobadas o rechazadas no vuelven a mostrarse como pendientes.
- Inscripciones mantiene el formulario dinámico montado entre pestañas y todos sus controles, incluidas las plantillas de responsable y asociados, pertenecen al `FormGroup` persistente.
- Los campos dinámicos de Inscripciones se enlazan directamente al `FormControl` persistente, evitando errores de `addControl` al recrear pestañas.
- Los loaders de pantalla usan el spinner común en modo fullscreen y bloquean la interacción durante las cargas; los indicadores compactos de tareas permanecen no bloqueantes.
- El listado de cambios de asociación fuerza una lectura fresca tras resolver una solicitud y la etiqueta visible se actualiza a `0.29.20#ESMERALDA`.

## 0.29.19#ESMERALDA - 2026-09-15

### Modificado

- Las cargas asíncronas de Secretaría usan `lib-ffsj-spinner` en pantallas, listados, formularios y paneles. Los tres indicadores compactos de envío dentro de botones se mantienen documentados como excepción técnica.

## 0.29.18#ESMERALDA - 2026-09-15

### Modificado

- La versión mostrada por Secretaría se deriva durante el build de `package.json`; la metadata de release `0.29.18+esmeralda` se presenta como `0.29.18#ESMERALDA` sin valores hardcodeados en componentes.

## 0.29.17#ESMERALDA - 2026-09-15

### Corregido

- Inscripciones conserva un borrador global con el `FormGroup` canónico, participantes y búsquedas por inscripción al navegar entre pestañas o volver a cargar el detalle.
- La cobertura de regresión valida creación, edición, guardado y recuperación de todos los tipos de campo dinámico, incluidos selectores, responsable y asociados.

## 0.29.16#ESMERALDA - 2026-09-15

### Corregido

- Datos de asociación cifra las credenciales de cambio de contraseña con el protocolo de Censo API, valida la confirmación antes de enviar y limpia el formulario tras una actualización correcta.

## 0.29.15#ESMERALDA - 2026-09-15

### Corregido

- Datos de asociación envía cambios para validación mediante una solicitud independiente; no actualiza los datos oficiales ni usa el flujo de asociados.
- Administración dispone de la bandeja de cambios de asociación para comparar valores actuales y propuestos, aprobar o rechazar.


## 0.29.13#ESMERALDA - 2026-09-14

### Corregido

- Hotfix de 0.29.10–0.29.12: Registro muestra y conserva responsables habilitados, y permite eliminar destinatarios de forma persistente.
- El formulario de alta conserva representantes legales que la solicitud usa para el documento descargable.
- Cupos y cargos consulta la API con la asociación y el ejercicio; la API determina su tipo real y filtra los cargos aplicables.
- El editor permite crear el primer formulario sin reutilizar un identificador de edición ni bloquear la carga.

## 0.29.12#ESMERALDA - 2026-09-14

### Corregido

- El editor de formularios reconoce la ruta de creación como formulario nuevo y reserva la actualización para identificadores existentes; los errores de guardado muestran su causa y liberan la carga.

## 0.29.11#ESMERALDA - 2026-09-14

### Corregido

- Configuración de Registro recupera el identificador persistido del responsable en cada selector y permite sustituirlo por otro miembro habilitado.

## 0.29.10#ESMERALDA - 2026-09-14

### Corregido

- Cupos y cargos solicita y valida el tipo real de la asociación, aplicando las mismas reglas de visibilidad que el formulario de alta.

## 0.29.9#ESMERALDA - 2026-09-14

### Modificado

- El listado administrativo de Solicitudes abre filtrado por estado Enviada; el filtro sigue pudiendo modificarse o eliminarse.

## 0.29.8#ESMERALDA - 2026-09-14

### Añadido

- El alta de menores incluye representantes legales, que se conservan en la solicitud.

## 0.29.7#ESMERALDA - 2026-09-14

### Modificado

- Los cambios de Datos de asociación se envían ahora como solicitud de validación, conservando los datos oficiales hasta la decisión administrativa.

## 0.29.6#ESMERALDA - 2026-09-14

### Añadido

- Nueva sección administrativa de Configuración con Ejercicios y Registro.
- Los destinatarios de Registro se asignan a responsables habilitados de Federación.

## 0.29.5#ESMERALDA - 2026-09-14

### Modificado

- Registro separa documentación y comunicaciones recibidas, enviadas, nuevas, contestadas y archivadas según corresponda.
- Los listados y detalles identifican la entidad y persona emisora.

## 0.29.4#ESMERALDA - 2026-09-13

### Añadido

- El listado de formularios permite buscar, filtrar, ordenar y paginar plantillas.
- La edición de una plantilla muestra sus inscripciones asociadas y permite abrirlas directamente.

## 0.29.3#ESMERALDA - 2026-09-13

### AÃ±adido

- El listado administrativo de inscripciones incorpora el filtro de archivadas y conserva paginaciÃ³n, ordenaciÃ³n y búsqueda.
- La exportación administrativa permite elegir columnas reales del formulario y descargar las inscripciones en Excel o PDF.

### Modificado

- Las inscripciones se retiran mediante archivado; la interfaz y la API ya no exponen su borrado físico.

## 0.29.2#ESMERALDA - 2026-09-13

### Añadido

- La gestión de inscripciones permite asignar un responsable administrativo habilitado, mostrarlo en el listado con su imagen y conservar información general.
- Se pueden adjuntar documentos durante el alta o edición de una inscripción y consultarlos desde su documentación.

## 0.29.1#ESMERALDA - 2026-09-13

### Añadido

- Las actividades y propuestas admiten documentación adicional (imágenes, PDF y formatos de oficina) y la muestran en su detalle.
- Los adjuntos de incidencias y respuestas de propuestas se consultan desde la conversación manteniendo las autorizaciones existentes.

## 0.29.0#ESMERALDA - 2026-09-13

### Añadido

- El menú contextual muestra la versión de Secretaría desde una fuente única.
- Calendario incorpora tabs para consulta, creación/propuesta y propuestas, junto con filtros, ordenación y paginación de estas últimas.
- Los días y actividades abren diálogos de consulta con sus eventos y detalles completos.

## 0.28.1#ESMERALDA - 2026-09-13

### Corregido

- El alta de asociados envía DNI, NIE, pasaporte o SIP mediante el campo unificado `nif`, permitiendo generar correctamente las certificaciones por historial reciente.

## 0.28.0#ESMERALDA - 2026-09-13

### Corregido

- El alta de asociado unifica la identificación visible y permite usar DNI, NIE, pasaporte o SIP.
- Las certificaciones pendientes se muestran en tareas y enlazan a Registro → Documentación; la tarea se actualiza al resolverlas.
- Los campos dinámicos de inscripciones, incluido Responsable, conservan su estado al navegar entre pestañas.

## 0.27.7#ESMERALDA - 2026-09-10

### Corregido

- El envío de inscripciones vuelve a permanecer deshabilitado mientras el formulario tenga campos inválidos.

## 0.27.6#ESMERALDA - 2026-09-10

### Corregido

- Los selectores con búsqueda de responsables y asociados sincronizan su valor visible con el formulario de inscripción.
- El envío detecta y explica cuando el texto introducido no pertenece a un asociado válido, sin enviar ese valor.

## 0.27.5#ESMERALDA - 2026-09-10

### Corregido

- Las inscripciones con participantes opcionales ya no bloquean silenciosamente el envío por una selección múltiple sin límite configurado.
- El botón de envío permite comprobar el formulario y muestra los campos que requieren revisión sin lanzar la petición hasta que sean válidos.

## 0.27.4#ESMERALDA - 2026-09-10

### Modificado

- La creación y edición de inscripciones permite no configurar asociados adultos ni infantiles.
- Las inscripciones sin participantes omiten ese paso para la asociación, conservando las validaciones cuando sí hay tipos configurados.

## 0.27.3#ESMERALDA - 2026-09-09

### Añadido

- Los campos de asociado, asociado adulto y asociado infantil permiten configurarse como selección múltiple.
- El formulario de inscripción permite buscar, añadir y retirar individualmente los asociados elegidos, conservando las selecciones al consultar o editar la entrada.

## 0.27.2#ESMERALDA - 2026-09-09

### Modificado

- La creación y edición de formularios se realiza en una página dedicada, con pestañas separadas para los datos y los campos.
- El listado abre cada formulario en su editor, sin perder los cambios introducidos al cambiar de pestaña.

## 0.27.1#ESMERALDA - 2026-09-09

### Añadido

- La gestión de formularios muestra su creador y el historial de cambios.
- El detalle de una inscripción muestra la persona responsable de su presentación.

## 0.27.0#ESMERALDA - 2026-09-09

### Añadido

- El constructor de formularios permite campos de fecha y hora, hora y selectores de opciones con selección única o múltiple y límite configurable.
- Las inscripciones validan y muestran las nuevas respuestas, incluidas las selecciones múltiples.

## 0.26.4#ESMERALDA - 2026-09-09

### Corregido

- Las tabs activas de Datos de asociación mantienen borde, fondo rojo suave y contraste visible.
- El selector de ubicación conserva en el campo visible la dirección confirmada junto con sus datos estructurados.
- La pantalla conserva el mensaje funcional seguro de Censo API cuando falla el guardado.

## 0.26.3#ESMERALDA - 2026-09-09

### Corregido

- El selector de ubicación resuelve por geocodificación inversa la dirección, código postal, localidad y provincia del punto elegido antes de permitir confirmarlo.
- Los fallos de guardado de asociación conservan el mensaje funcional seguro de la API en las distintas formas de respuesta.
- La pestaña activa utiliza texto rojo corporativo sobre fondo blanco, con estados de foco y hover visibles.

## 0.26.2#ESMERALDA - 2026-09-09

### Corregido

- La edición de asociación no reenvía metadatos nulos ajenos a los campos editables.
- La pestaña activa conserva contraste visible durante la edición.
- El selector de ubicación incorpora la base visual de Leaflet, con mapa dimensionado correctamente y sin desbordamiento horizontal en el diálogo.
- Los errores de guardado de datos de asociación muestran el mensaje funcional devuelto por Censo API.

## 0.26.1#ESMERALDA - 2026-09-09

### Corregido

- Datos de asociación usa el spinner común y mantiene la pestaña activa legible.
- El selector de ubicación abre un diálogo con mapa, búsqueda y ajuste exacto del punto.
- Los campos de contraseña usan iconos accesibles para mostrar u ocultar su contenido.

## 0.26.0#ESMERALDA - 2026-09-09

### Mejorado

- Datos de la asociación usa ubicaciones estructuradas y georreferenciadas para domicilio, sede y plantàs específicas de Foguera o Barraca.
- Los campos derivados de ubicación se completan desde el selector y no se editan manualmente.
- Acceso permite mostrar u ocultar las tres contraseñas sin modificar su comportamiento.

## 0.25.11#ESMERALDA - 2026-09-09

### Mejorado

- Los campos individuales de asociado en Inscripciones permiten escribir y localizar por nombre al asociado, manteniendo el selector múltiple de asistentes.
- El selector de responsable sólo ofrece asociados adultos.
- Las pantallas de Registro, Solicitudes y gestión de asociados emplean terminología de certificación en los textos visibles.

## 0.25.8#ESMERALDA - 2026-09-08

### Corregido

- Los checks de permisos usan una acción explícita y actualizan su estado de forma inmediata.
- Si no se puede guardar un permiso, la pantalla restaura el valor anterior en lugar de quedar en un estado inconsistente.

## 0.25.7#ESMERALDA - 2026-09-08

### Corregido

- La ruta `/admin` vuelve a mostrar el formulario de acceso de personas antes de exigir una sesión.
- Tras autenticar, la pantalla espera el contexto de permisos y sólo carga la administración para usuarios con `admin:permissions`.

## 0.25.6#ESMERALDA - 2026-09-08

### Corregido

- El modo administrativo se determina por el permiso `admin:access` cargado desde Secretaría, no por un ID fijo de cargo.
- Las rutas administrativas esperan la resolución del contexto autenticado y la cabecera se actualiza correctamente al entrar como personal autorizado.
- La pantalla de permisos queda protegida también en el cliente por `admin:permissions`.

## 0.25.3#ESMERALDA - 2026-09-08

### Corregido

- El detalle de actividad muestra su responsable.
- Administración puede adjuntar imágenes y documentos al abrir una incidencia de propuesta; las asociaciones pueden responder con los mismos tipos permitidos.
- El detalle de propuestas muestra el nombre real de la asociación responsable y reutiliza la descarga autenticada de sus imágenes.

## 0.25.2#ESMERALDA - 2026-09-08

### Corregido

- El acceso administrativo reconoce el cargo vigente de Vicepresidencia en lugar del cargo no administrativo `16`.
- El guardado de datos de asociación muestra el motivo seguro devuelto por API cuando no puede completarse.
- Las propuestas de Calendario muestran fecha y hora, e incluyen la imagen autenticada cuando existe.

## 0.25.1#ESMERALDA - 2026-09-08

### Corregido

- Soporte muestra junto a la descripción el error de obligatoriedad y longitud mínima al intentar enviar una incidencia inválida.
- El contador del listado de asociados excluye las bajas y el selector de tipo adapta su etiqueta a Barraca o Foguera sin alterar el valor técnico.

### Mejorado

- Calendario, Inscripciones y Registro muestran el indicador de carga común durante sus peticiones principales.

## 0.25.0#ESMERALDA - 2026-09-08

### Mejorado

- Calendario permite indicar día y hora de inicio y fin, ajustando el fin cuando queda antes del inicio.
- El detalle de propuestas muestra el hilo con sus adjuntos y permite a asociaciones adjuntar ficheros a la respuesta de una incidencia.

### Corregido

- La sustitución de la imagen de una actividad deja una única referencia activa y la carga limpia correctamente referencias no disponibles.

## 0.24.0#ESMERALDA - 2026-09-07

### Añadido

- La ficha de asociación se organiza por pestañas y conserva el formulario de edición compartido entre secciones.
- La asociación puede actualizar su propia contraseña desde la pestaña Acceso, validando la contraseña actual en servidor.
- El acceso por QR intercambia una credencial opaca por una sesión normal y elimina el token de la URL inmediatamente.

### Mejorado

- Las altas con historial solicitan certificaciones de antecedentes, limitadas a los cuatro ejercicios anteriores al seleccionado.

## 0.23.7#ESMERALDA - 2026-09-06

### Añadido

- Las propuestas de actividad disponen de un detalle propio con sus datos y conversación.
- Las asociaciones pueden responder desde el hilo cuando Administración solicita información, devolviendo la propuesta a revisión.

## 0.23.5#ESMERALDA - 2026-09-06

### Mejorado

- Las asociaciones proponen actividades con su responsable precargado y bloqueado; la etiqueta se fija como Entidad asociada sin mostrar el selector.

## 0.23.2#ESMERALDA - 2026-09-06

### Técnico

- La configuración de desarrollo usa las URL DEV normales de las APIs de Censo y Secretaría, sin el sufijo de contingencia East US.

## 0.23.1#ESMERALDA - 2026-09-06

### Corregido

- El fallback de i18n ya no expone claves técnicas cuando falta una traducción.
- Los diálogos de confirmación reutilizan la acción Cancelar localizada y reaccionan al idioma activo.

## 0.23.0#ESMERALDA - 2026-09-06

### Corregido

- El calendario sólo publica propuestas de asociaciones tras una decisión administrativa válida.
- Las actividades y propuestas admiten imagen al crearse, validan formato y tamaño, y permiten sustituirla o eliminarla.
- La revisión administrativa de propuestas usa diálogos integrados para solicitar información o indicar el motivo del rechazo.

## 0.22.0#ESMERALDA - 2026-09-05

### Añadido

- Soporte permite recuperar un ticket como pendiente mediante la acción persistente **Marcar como no leída**.
- Registro permite volver a marcar documentación y comunicaciones como no leídas sin alterar su estado funcional.

## 0.21.1#ESMERALDA - 2026-09-05

### Corregido

- El acceso público de asociaciones ya no muestra un enlace directo al login administrativo.
- El ejemplo de CIF del acceso público es ficticio y los textos se resuelven mediante i18n.

## 0.21.0#ESMERALDA - 2026-09-05

### Añadido

- Sistema único de traducciones con castellano, valenciano e inglés, preferencia persistente y fallback en castellano.
- Selector de idioma accesible dentro del menú de identidad.
- Traducción de navegación, acciones de contexto y acceso de asociaciones.
- Componente compartido para normalizar el selector visual de adjuntos.

## 0.20.0#ESMERALDA - 2026-09-05

### Añadido

- Las asociaciones pueden proponer actividades para el calendario sin publicarlas directamente.
- Calendario incorpora bandejas de propuestas propias y de revisión administrativa con publicación, rechazo o solicitud de información.
- Las propuestas mantienen su estado, asociación autora y trazabilidad de decisiones.

## 0.19.1#ESMERALDA - 2026-09-05

### Corregido

- Los campos obligatorios de los formularios dinámicos de Inscripción se identifican de forma visible y accesible antes del envío.
- La misma regla configura el validador reactivo, el atributo `required`, la semántica ARIA y el mensaje de error para todos los tipos de campo soportados.
- Los labels quedan asociados a sus controles y el feedback de validación se anuncia correctamente a tecnologías de asistencia.

## 0.19.0#ESMERALDA - 2026-09-05

### Mejorado

- La bandeja administrativa de Inscripciones incorpora búsqueda, filtros por estado y disponibilidad, paginación y ordenación desde API.
- El listado conserva búsqueda, filtros, orden y página al abrir un detalle y volver.
- El alta de asociados admite DNI, NIE o pasaporte alfanumérico y actualiza sus etiquetas y mensajes.

## 0.18.6#ESMERALDA - 2026-09-05

### Corregido

- La ruta literal `/inscripciones/nueva` se identifica correctamente y abre el formulario sin pasar por el listado.

## 0.18.5#ESMERALDA - 2026-09-05

### Corregido

- El botón `Crear inscripción` activa el formulario inmediatamente y no depende de que la navegación termine para responder.

## 0.18.4#ESMERALDA - 2026-09-04

### Corregido

- La ruta específica de creación de Inscripciones se evalúa antes que el listado y ya abre el formulario administrativo correctamente.

## 0.18.3#ESMERALDA - 2026-09-04

### Mejorado

- Los filtros de Registro se organizan en una retícula compacta con labels asociados, búsqueda prioritaria y botón integrado.

## 0.18.2#ESMERALDA - 2026-09-04

### Corregido

- El botón `Crear inscripción` activa inmediatamente el formulario administrativo y notifica si la navegación no puede completarse.

## 0.18.1#ESMERALDA - 2026-09-04

### Corregido

- La edición administrativa de actividades permite modificar la categoría visual y conservarla al guardar.
- La creación administrativa de Inscripciones informa de campos obligatorios y del error funcional devuelto por la API.

## 0.18.0#ESMERALDA - 2026-09-04

### Mejorado

- Solicitudes de asociaciones se presenta en tabla responsive e incorpora la carga de adjuntos desde el detalle.
- Registro dispone de filtros más compactos y la cabecera se ajusta a escritorios intermedios.

### Corregido

- La creación de Inscripciones muestra el motivo de error devuelto por la API, sin fallo silencioso.

## 0.17.1#ESMERALDA - 2026-09-04

### Corregido

- El diálogo de detalle de Solicitudes devuelve el foco a la fila de origen, admite cierre con Escape y declara correctamente la relación accesible entre pestañas y paneles.

## 0.17.0#ESMERALDA - 2026-09-04

### Mejorado

- La bandeja de Solicitudes de asociaciones incorpora búsqueda, filtros, ordenación y paginación desde servidor.
- El detalle se abre en un diálogo con pestañas de resumen, cambios, incidencias, adjuntos e historial, sustituyendo el panel lateral.
- La bandeja evita cargar el detalle de cada solicitud antes de que la asociación lo solicite.

## 0.16.1#ESMERALDA - 2026-09-04

### Corregido

- La edición de actividades conserva y muestra la categoría visual persistida; las actividades antiguas usan FFSJ como valor por defecto.

## 0.16.0#ESMERALDA - 2026-09-04

### Añadido

- Las actividades de Calendario admiten una categoría visual persistente con paleta FFSJ, asociación, Ayuntamiento y otras entidades.

## 0.15.1#ESMERALDA - 2026-09-04

### Corregido

- La asociación conserva disponibilidad, orden y página del listado de Inscripciones al abrir un detalle y volver.
- El listado se recupera automáticamente si un filtro reduce el total de páginas, evitando estados vacíos por una página ya inexistente.

## 0.15.0#ESMERALDA - 2026-09-04

### Mejorado

- La bandeja de Inscripciones de asociaciones muestra disponibilidad y participación, permite filtrar por plazo y pagina u ordena los resultados desde la API.

## 0.14.1#ESMERALDA - 2026-09-04

### Corregido

- La configuración de Karma ejecuta la suite una sola vez, evitando que `npm test` quede en observación indefinida durante la validación de componentes compartidos.

## 0.14.0#ESMERALDA - 2026-09-04

### Mejorado

- La cabecera conserva acceso a la navegación en escritorio estrecho y tablet mediante un menú compacto, sin solapar la marca ni el contexto de asociación.
- Soporte reutiliza el selector común de adjuntos para alta y respuestas administrativas o de asociación, con límites, formatos, errores, retirada y estado vacío coherentes.
- Los filtros de Documentación y Comunicaciones de Registro comparten una disposición agrupada y adaptable a escritorio estrecho, tablet y móvil.
- Los botones deshabilitados disponen de un tratamiento visual común, incluido cursor y contraste inequívocos.

### Testing

- Se valida la compilación Angular de desarrollo y se documentan las pruebas manuales de cabecera, adjuntos, filtros y estados de interacción.

## 0.13.0#ESMERALDA - 2026-09-03

### Mejorado

- La ficha de una actividad nueva se hidrata al recargar el calendario y muestra su detalle completo; los paneles administrativos de actividad e inscripciones se presentan cerrados y son expandibles.
- Inscripciones abre el editor completo de Formularios en un dialogo contextual. Al guardar una plantilla nueva o editar la seleccionada, conserva todos sus campos y configuracion y la asocia automaticamente a la inscripcion.

### Testing

- Se valida el editor compartido en modo contextual junto con la compilacion y la suite de pruebas Angular.

## 0.12.0#ESMERALDA - 2026-09-03

### Mejorado

- Los listados de Documentacion y Comunicaciones de Registro usan paginacion desde servidor, con orden por actualizacion, estado o titulo.
- Los filtros de bandeja, ano, texto y estado se conservan al ordenar o cambiar de pagina; cada bandeja resuelve sus criterios en API para evitar resultados vacios o inconsistentes.
- La navegacion de paginas anuncia el total y la pagina actual, y mantiene sus controles deshabilitados durante la carga.

## 0.11.2#ESMERALDA - 2026-09-03

### Corregido

- El detalle de cambios de cargo ya no muestra `Sustituye a: -` cuando el cambio no sustituye a nadie; diferencia correctamente sustitución, cesión y cambio independiente.

### Testing

- Se cubre una solicitud conjunta con cambio de cargo sin relación personal para conservar cargo y ejercicio sin datos vacíos engañosos.

## 0.11.1#ESMERALDA - 2026-09-03

### Corregido

- El detalle de Solicitudes completa cargo, ejercicio y persona relacionada en cambios de cargo, incluidos los datos heredados de cesiones, y recupera el DNI/NIE original cuando no se modifica.
- Incidencias permite a administración añadir comentarios consecutivos y adjuntos sin cerrar el hilo; los adjuntos se descargan mediante la petición autenticada.

### Testing

- Se cubre el uso de datos originales y de ejercicio heredado en el detalle de Solicitudes.

## 0.11.0#ESMERALDA - 2026-09-03

### Mejorado

- El detalle administrativo de Solicitudes se organiza en las pestañas Resumen, Cambios, Incidencias, Adjuntos e Historial.
- Los cambios se presentan por asociado con su efecto y una comparación legible de campo, valor anterior y valor propuesto, incluida la información de cambios de cargo.
- Las pestañas son accesibles por teclado con flechas, Inicio y Fin, y la comparación se adapta a móvil sin perder sus etiquetas.

## 0.10.2#ESMERALDA - 2026-09-03

### Corregido

- En móvil, la bandeja de Soporte elimina el botón redundante `Ver`: la fila conserva la apertura de detalle con pulsación, Enter y Espacio.
- `Guardar estado` muestra un estado visual deshabilitado inequívoco hasta que se modifica el selector.

## 0.10.1#ESMERALDA - 2026-09-03

### Corregido

- La modificación de estado de un ticket de Soporte está disponible en la cabecera del detalle, junto al estado actual.
- La bandeja móvil ajusta el ancho de sus contenedores y columnas prioritarias para evitar recortes en el borde derecho y mantener accesible la acción de detalle.

## 0.10.0#ESMERALDA - 2026-09-03

### Mejorado

- La bandeja administrativa de Soporte incorpora filtros conservados, orden estable y paginacion de tickets desde servidor.
- El listado prioriza ticket, asociacion, asunto, estado y actualizacion; sus filas son operables con teclado y no cargan detalles por anticipado.
- El detalle administrativo sitúa el historial como contenido principal, mantiene el contexto secundario contraido y mejora la respuesta movil.

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
