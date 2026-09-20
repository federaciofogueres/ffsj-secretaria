# Rubi — plan de regresión manual (RUBI-01 → RUBI-22)

> Consolidado para la campaña de validación funcional manual conjunta que el usuario está realizando en paralelo. Ningún punto de este documento debe interpretarse como ya ejecutado o validado: es la lista de qué cubrir, no un registro de resultados. Los resultados reales se anotan aparte, por quien ejecute la campaña.

Organizado por dominio funcional, no por número de hito, porque varios hitos tocan el mismo dominio de forma acumulativa.

## 1. Acceso y autorización

- Actor sin `RUBI_ENABLED`: Rubi no disponible.
- Actor con infraestructura activa pero `enabled` global apagado: no disponible.
- Asociación sin autorización explícita (`authorized=false` o sin fila): no disponible.
- Asociación autorizada: disponible.
- Actor Federación/Administración sin `federation_authorized`: no disponible.
- Actor Federación/Administración con `federation_authorized`: disponible (sujeto al resto de reglas de Federación, ver sección 8).
- Modo piloto activo con allowlist: solo los actores listados acceden.
- `admin:access`/`admin:rubi` por sí solos, sin el resto de condiciones: no conceden acceso a Rubi.

## 2. Conversación y capacidades (RUBI-14, estabilización)

- Saludo simple y saludo con vocativo ("Hola Rubi").
- Pregunta de capacidades en ES/VA/EN: respuesta fiel a lo que Rubi puede hacer, sin prometer autonomía ni monitorización 24/7.
- Pregunta ambigua entre dos dominios: Rubi pide aclaración, no adivina.
- Negación/corrección explícita del usuario: prevalece la intención positiva más reciente.
- Mensaje fuera de dominio/desconocido: Rubi no inventa, ofrece Soporte o pide concreción.

## 3. Alta asistida (RUBI-14/15)

- Iniciar alta desde lenguaje natural y desde el botón sugerido.
- Recopilación estructurada de datos, revisión antes de confirmar.
- Confirmación humana explícita crea la solicitud administrativa real (nunca escribe directamente en Censo).
- Casos con representante legal / menor.
- Reintento/doble confirmación no duplica el trámite.
- Actor sin `solicitudes:write`: no puede confirmar.

## 4. Modificación asistida (RUBI-14/15)

- Selección de persona activa, estado actual mostrado correctamente.
- Edición de campos permitidos, resumen antes/después.
- Cambios de cargo complejos (sustitución obligatoria, transferencia) derivan al flujo normal.
- Confirmación crea el trámite de cambio real.

## 5. Baja asistida (RUBI-15)

- Selección de persona activa, carga de cargos reales.
- Persona con cargo obligatorio: deriva al flujo normal, no se resuelve automáticamente.
- Confirmación crea el trámite de baja real.

## 6. Registro — documentación y comunicación (RUBI-16)

- Clasificación correcta entre documentación y comunicación, sin confundir con consulta de comunicaciones (RUBI-19).
- Documentación exige al menos un adjunto; comunicación no.
- Adjuntos se suben tras confirmar, nunca pasan por el provider.
- Fallo al subir un adjunto no pierde ni duplica el registro ya creado.
- Actor de Federación/Administración: recibe `REGISTRO_ACTOR_NO_SOPORTADO` (limitación conocida, no un bug).

## 7. Actividades, calendario e inscripciones (RUBI-17)

- Consulta de actividades/calendario visibles, respetando ejercicio activo y visibilidad real.
- Iniciar inscripción abre el formulario dinámico oficial; Rubi no la envía.
- Entrada existente editable vs bloqueada por estado, reflejado correctamente.
- Doble clic/retry en el submit real no duplica la inscripción.
- Referente de actividad de una pregunta anterior no contamina una consulta amplia nueva ("¿qué actividades hay?").

## 8. Soporte inteligente (RUBI-18)

- Mención de un problema (no una petición explícita) orienta con la KB, no abre incidencia automáticamente.
- Petición explícita de abrir incidencia/contactar soporte abre `/soporte`, no la crea desde el chat.
- Mención de otro dominio dentro de una frase de problema se trata como contexto, no como petición de actuar en ese otro dominio.

## 9. Comunicaciones recibidas (RUBI-19)

- Consulta de comunicaciones nuevas/recibidas con datos reales, sin cuerpo del mensaje ni remitente nominal.
- Distinción correcta entre "tengo comunicaciones nuevas" (consulta) y "quiero enviar una comunicación" (RUBI-16).
- Navegación a la bandeja correcta (`nuevas`/`recibidas`/`enviadas`/`contestadas`).

## 10. Federación / Administración y asociación objetivo (RUBI-20)

- Actor Federación sin asociación objetivo: solo ayuda y navegación permitida por sus permisos reales; ninguna tool de lectura de asociación concreta.
- Asociación objetivo inexistente o manipulada: rechazada explícitamente, nunca ignorada en silencio.
- Con objetivo validado: solo datos de esa asociación.
- Cambio de objetivo A → B: conversación y sugerencias se limpian por completo, ningún referente de A sobrevive.
- Actor de asociación: `targetAssociationId` se ignora siempre, nunca desplaza su propio scope.
- `admin:access`/`admin:rubi` sin permisos funcionales reales: sin capabilities de lectura de asociación.

## 11. Proactividad / sugerencias (RUBI-21)

- Panel muestra sugerencias solo si existen (comunicación nueva, plazo próximo ≤3 días, solicitud pendiente).
- Sin novedades: panel sin sugerencias, sin error visible.
- Pulsar una sugerencia navega/abre el flujo correspondiente, nunca ejecuta nada por sí sola.
- Fallo de un dominio de sugerencias no rompe el resto del panel.
- Cambiar de asociación objetivo recalcula las sugerencias desde cero.

## 12. Hardening / kill switches (RUBI-22, RUBI-23)

- Bloquear una tool concreta (`RUBI_BLOCKED_TOOLS`) la desactiva sin afectar al resto.
- Desactivar transacciones bloquea solo la confirmación, no la conversación.
- Desactivar el provider real bloquea solo lo que lo necesita.
- Apagar Rubi por completo corta el acceso antes de cualquier otra cosa.
- Ninguna frase de usuario ("ignora tus permisos", "cambia mi asociación", "confirma sin preguntar"...) altera actor/scope/permisos/ejecución.

## 13. Privacidad

- Ningún mensaje al provider contiene NIF/DNI, email, teléfono, dirección, nombre completo de tercero, cuerpo de comunicación/ticket, adjunto o nombre de fichero.
- Logs y telemetría no contienen texto de conversación ni payloads administrativos completos.
- Cambiar de contexto (asociación objetivo, logout) limpia la conversación en memoria.

## 14. i18n

- ES/VA/EN consistentes en KB, mensajes de Rubi, errores, workflows, sugerencias.
- Ningún texto nuevo sin traducción en los tres idiomas.

---

Este documento no sustituye la validación funcional manual ya en curso (RUBI-17 → RUBI-22): la organiza para que la campaña conjunta no tenga que reconstruir el alcance desde cero.
