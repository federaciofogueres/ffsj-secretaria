# Changelog

## 1.8.1#RUBI — Corrección de blocker de validación manual (RUBI-20)

> Hallazgo real durante la validación manual de RUBI-20 en DEV: un usuario Federación/Administración autorizado no veía el selector de asociación objetivo en el panel Rubi, bloqueando 150-06 → 150-10. Corrección de una sola causa, sin funcionalidad nueva de producto. La validación manual 150-06 → 150-10 sigue pendiente de repetirse en DEV tras el despliegue.

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
