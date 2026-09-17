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
- Las tools son cerradas, tipadas, allowlisted y se vuelven a autorizar al ejecutarse.
- Toda operación persistente requiere revisión y confirmación humana explícita.
- Gemini no ejecuta altas. `start_alta` solo abre el workflow local; la confirmación llama a backend sin pasar por el provider.
- Registrar un alta administrativa crea el trámite/solicitud correspondiente; no equivale a escribir directamente en Censo.
- Se reutilizan los workflows y reglas existentes de Secretaría, sin crear una vía administrativa paralela.
- Las operaciones persistentes preservan idempotencia, bloqueo y revalidación para soportar concurrencia y reintentos.
- Rubi es opcional: `RUBI_ENABLED`, los flags transaccional/provider y la allowlist del piloto permiten desactivarla o limitarla.
- La operación ordinaria de Rubi (habilitarla globalmente, por asociación, o el uso del provider real) se administra desde Secretaría (Configuración → RUBI), sin necesidad de tocar variables de entorno. Esa configuración administrada es siempre subordinada a los kill switches de infraestructura (`RUBI_ENABLED`, `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_TRANSACTIONAL_ENABLED`): si la infraestructura deshabilita algo, ninguna configuración administrada puede reactivarlo. Un fallo al leer esa configuración administrada nunca bloquea un acceso ya autorizado por las capas superiores (fail-open), para no depender de que una migración ya se haya ejecutado.
- Producción es intocable sin autorización explícita del usuario en el prompt vigente.

## Provider

La API abstrae proveedores mediante `RubiProvider`/`RubiProviderFactory`. La selección se realiza por configuración de entorno y el provider predeterminado y actualmente seleccionado es Gemini, con modelo configurable. El uso real del provider tiene un kill switch independiente, límites, presupuestos persistentes, timeout y como máximo un retry seguro. No se documentan ni almacenan aquí secretos o API keys.

## Privacidad

El frontend envía solo mensaje, idioma, ruta, historial reciente saneable y contexto de pantalla allowlisted. La API elimina patrones de documento, email, teléfono, fecha y tokens antes del provider, abstrae del historial los datos de alta y nunca registra texto de conversación ni payloads de trámites. La observabilidad usa identificadores seudonimizados/truncados, categorías, estados, latencias, contadores y códigos seguros. El feedback del piloto es exclusivamente estructurado y no incluye conversación ni texto libre.

## Evolución

La infraestructura de piloto (acceso, feedback y telemetría) puede existir en el código sin constituir una apertura del producto: debe permanecer desactivada/no configurada hasta una autorización explícita.

Cada workflow nuevo debe demostrar y repetir el patrón ya validado:

`entender → recopilar de forma segura → preparar → revisión humana → confirmación → backend determinista`

Un workflow nuevo requiere revisar permisos, privacidad, contrato, idempotencia, concurrencia, telemetría y pruebas. No existe una cola automática de tareas y no debe introducirse implícitamente.
