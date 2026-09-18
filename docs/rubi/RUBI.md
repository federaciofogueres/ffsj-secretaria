# Rubi — decisiones permanentes

Rubi es el asistente de trabajo de la Secretaría Virtual de la FFSJ. Su objetivo no es sustituir la aplicación ni responder de forma aislada sobre ella, sino ayudar al usuario a comprender el contexto, encontrar información, navegar y completar workflows seguros dentro de Secretaría.

> No queremos que la IA responda preguntas sobre Secretaría. Queremos que ayude a trabajar en Secretaría.

## Arquitectura vigente

El flujo real es:

`Usuario → Angular (panel Rubi) → Secretaría API → RubiGateway/capa determinista → provider + tools/capabilities → servicios existentes de Secretaría`

- `ffsj-secretaria` contiene el panel Angular, la conversación efímera, el contexto de pantalla y la interfaz estructurada de alta.
- `ffsj-secretaria-api` autentica, resuelve asociación, ejercicio, permisos, scopes y capabilities. `RubiGateway` decide entre resolución determinista y provider y solo permite tools registradas.
- Los servicios ordinarios de Secretaría ejecutan las reglas y la persistencia. En el alta, Rubi prepara una referencia temporal y la confirmación humana registra la solicitud administrativa mediante `AltaWorkflow`.
- El provider nunca recibe autoridad de ejecución ni acceso a servicios o bases de datos.

## Invariantes

- El backend es la fuente de verdad para identidad, asociación, ejercicio, permisos, scopes, capabilities, reglas y resultados.
- El LLM no accede directamente a las bases de datos de Secretaría ni de Censo.
- La IA no genera ni ejecuta SQL, endpoints arbitrarios o rutas no registradas.
- Permisos, scope de asociación y capabilities se calculan en backend a partir de la sesión autenticada.
- La PII sensible permanece fuera del provider. Los mensajes se sanean y un alta con datos personales usa el flujo determinista y estructurado.
- No se guardan datos sensibles en history, telemetría, logs ni almacenamiento web. La conversación vive en memoria, tiene TTL y se limpia al cambiar de contexto o cerrar sesión.
- Las tools son cerradas, tipadas y se vuelven a autorizar al ejecutarse. Las capabilities (derivadas de permisos reales) son la única puerta de disponibilidad por defecto: una tool nueva y su capability están disponibles sin tocar configuración. Una lista de bloqueo de infraestructura (`RUBI_BLOCKED_TOOLS`), vacía por defecto, puede restringir puntualmente una tool concreta como kill switch extraordinario, pero nunca al revés: una lista de tools *permitidas* que haya que mantener actualizada manualmente queda descartada como patrón, precisamente porque quedar desactualizada hace desaparecer funcionalidades nuevas sin ningún error visible.
- Toda operación persistente requiere revisión y confirmación humana explícita.
- Gemini no ejecuta altas. `start_alta` solo abre el workflow local; la confirmación llama a backend sin pasar por el provider.
- Registrar un alta administrativa crea el trámite/solicitud correspondiente; no equivale a escribir directamente en Censo.
- Se reutilizan los workflows y reglas existentes de Secretaría, sin crear una vía administrativa paralela.
- Las operaciones persistentes preservan idempotencia, bloqueo y revalidación para soportar concurrencia y reintentos.
- El patrón preparar → revisar → confirmar (opaco, con TTL, vinculado a actor/asociación, con reintento idempotente) se reutiliza en cada workflow nuevo, pero el almacén concreto (tabla) no se comparte automáticamente solo por ahorrar una migración: si el dominio nuevo no encaja en el esquema de un almacén existente (por ejemplo, exige columnas que el dominio nuevo no necesita, como el ejercicio obligatorio de altas/modificaciones/bajas para un dominio que no lo requiere), se crea un almacén propio con el mismo patrón en lugar de forzar el esquema compartido o relajar sus columnas. Tampoco se hace el refactor inverso (generalizar el almacén existente a costa de tocar los workflows que ya lo usan) solo para evitar una tabla nueva.
- Cuando una operación implica archivos, estos nunca viajan al provider ni se guardan en el almacén temporal de preparación (que solo contiene metadatos: nombre, tipo, tamaño). Los ficheros permanecen en el cliente hasta que el registro ya existe (tras confirmar) y se suben entonces mediante el mecanismo de adjuntos genérico ya existente, con una llamada Angular → API directa.
- Rubi es opcional: `RUBI_ENABLED`, los flags transaccional/provider y la allowlist del piloto permiten desactivarla o limitarla.
- La operación ordinaria de Rubi (habilitarla globalmente, o el uso del provider real) se administra desde Secretaría (Configuración → RUBI), sin necesidad de tocar variables de entorno. Esa configuración administrada es siempre subordinada a los kill switches de infraestructura (`RUBI_ENABLED`, `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_TRANSACTIONAL_ENABLED`): si la infraestructura deshabilita algo, ninguna configuración administrada puede reactivarlo.
- `enabled` y `authorized` son conceptos distintos y nunca se usan indistintamente. `enabled` es el estado funcional global de Rubi (infraestructura + configuración global de Secretaría). `authorized` es la autorización explícita de una asociación concreta para usar Rubi, administrada por asociación desde Secretaría. Una asociación sin fila de configuración explícita, o ante cualquier fallo al leerla, NO está autorizada (deny-by-default): autorizar es siempre un acto explícito del panel admin. En cambio, un fallo al leer el estado global (`enabled`) es fail-open y nunca bloquea un acceso ya autorizado por las capas superiores, para no depender de que una migración ya se haya ejecutado.
- La regla de acceso en modo operativo normal es `RUBI_ENABLED (infraestructura) && enabled (configuración global) && authorized (asociación)`. La allowlist del piloto (RUBI-13) no forma parte del modo normal y nunca lo restringe: solo se aplica cuando el modo piloto está activado explícitamente por infraestructura (`RUBI_PILOT_MODE_ENABLED`), añadiendo el requisito adicional de que el actor esté en la allowlist. Toda ruta protegida de Rubi (`/asistente/acceso`, conversación, alta, modificación, baja) resuelve el acceso mediante la misma función única, para que no pueda ocurrir que `/asistente/acceso` informe autorizado y un workflow deniegue después.
- Producción es intocable sin autorización explícita del usuario en el prompt vigente.

## Provider

La API abstrae proveedores mediante `RubiProvider`/`RubiProviderFactory`. La selección se realiza por configuración de entorno y el provider predeterminado y actualmente seleccionado es Gemini, con modelo configurable. El uso real del provider tiene un kill switch independiente, límites, presupuestos persistentes, timeout y como máximo un retry seguro. No se documentan ni almacenan aquí secretos o API keys.

## Privacidad

El frontend envía solo mensaje, idioma, ruta, historial reciente saneable y contexto de pantalla allowlisted. La API elimina patrones de documento, email, teléfono, fecha y tokens antes del provider, abstrae del historial los datos de alta y nunca registra texto de conversación ni payloads de trámites. La observabilidad usa identificadores seudonimizados/truncados, categorías, estados, latencias, contadores y códigos seguros. El feedback del piloto es exclusivamente estructurado y no incluye conversación ni texto libre.

## Evolución

La infraestructura de piloto (acceso, feedback y telemetría) puede existir en el código sin constituir una apertura del producto: debe permanecer desactivada/no configurada hasta una autorización explícita.

Alta, modificación y baja son intenciones mutuamente excluyentes y se resuelven mediante una única clasificación (no una cascada de comprobaciones independientes en la que la primera evaluada "gana" por orden): se calculan los tres marcadores de tema, se descarta el que aparezca dentro de una negación explícita del usuario, y si queda más de un dominio activo se pide una aclaración concreta en lugar de adivinar. Ningún marcador de tema puede basarse en palabras compartidas por varios trámites (persona, asociado, hacer); cada dominio exige una palabra o combinación propia. Cualquier workflow nuevo que añada su propio tema determinista debe integrarse en esta misma clasificación, no en una comprobación aparte evaluada antes o después de las demás.

Cada workflow nuevo debe demostrar y repetir el patrón ya validado:

`entender → recopilar de forma segura → preparar → revisión humana → confirmación → backend determinista`

Un workflow nuevo requiere revisar permisos, privacidad, contrato, idempotencia, concurrencia, telemetría y pruebas. No existe una cola automática de tareas y no debe introducirse implícitamente.
