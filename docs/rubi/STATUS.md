# Rubi — estado actual

> Este archivo describe el estado actual. Si contradice al código, prevalece el código.

## Versión y alcance

- Rama de frontend y API: `1.1.0#RUBI`.
- Último hito funcional: RUBI-14 — Modificaciones asistidas, implementado y validado en código/local.
- Último estado desplegado conocido: RUBI-12 validado en DEV. RUBI-13 y RUBI-14 no se han desplegado ni activado en ningún entorno.
- Workflows administrativos asistidos: altas y modificaciones de personas. Las bajas asistidas no están implementadas.
- La infraestructura de piloto de RUBI-13 se conserva disponible, desactivada/no configurada remotamente.

## Disponible hoy

- Conversación contextual en ES/VA/EN, FAQ/Knowledge Base y ayuda sobre la pantalla actual.
- Navegación solo a destinos internos registrados.
- Permisos, scope de asociación y catálogo dinámico de capabilities/tools resueltos por backend.
- Gemini como provider actual seleccionable por configuración, con fallback determinista, límites, presupuesto, timeout, retry acotado y telemetría de consumo.
- Alta asistida estructurada: recopilación local de PII, preparación determinista, revisión, confirmación humana, idempotencia, revalidación y registro de la solicitud administrativa real.
- Modificación asistida de una persona activa: selección estructurada, estado actual, edición de campos permitidos, resumen antes/después, preparación, confirmación humana, revalidación y creación del trámite administrativo ordinario de cambio.
- Los cambios complejos de cargos —sustituciones obligatorias, transferencias o falta de plazas— se derivan al flujo normal existente.
- La confirmación de altas y modificaciones se realiza desde Angular contra la API. Gemini solo puede proponer abrir el formulario seguro; no prepara, confirma, registra ni escribe en Censo.
- Privacidad: PII fuera del provider, historial efímero en memoria y logs/telemetría sin texto sensible ni payloads administrativos completos.
- Infraestructura de piloto: allowlist seudonimizada, kill switch, feedback estructurado y funnel agregable para conversación, navegación, altas y modificaciones.

## Configuración relevante

Los valores efectivos pertenecen al entorno y no deben copiarse a documentación:

- Acceso: `RUBI_ENABLED`, `RUBI_PILOT_ACCESS_MODE`, `RUBI_PILOT_ACTOR_HASHES`.
- Persistencia: `RUBI_TRANSACTIONAL_ENABLED`.
- Provider: `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_PROVIDER`, `RUBI_MODEL` y la credencial del provider.
- Tools y contexto: `RUBI_ALLOWED_TOOLS`, máximos de mensaje, entrada, salida, historial y contexto.
- Resiliencia: timeout, llamadas máximas, retries y demora base.
- Protección de uso: límites por minuto/día/concurrencia y presupuestos diario/mensual.

El modo de piloto por defecto es `allowlist` y una lista vacía no autoriza a nadie. `admin:access` no concede acceso al piloto. Los elementos de la allowlist son claves seudonimizadas, nunca nombres, documentos, emails o tokens.

## Garantías del workflow de modificaciones

- El backend obtiene de Censo el estado actual y valida asociación, persona, ejercicio, campos, duplicados y cargos.
- La preparación es temporal, opaca, vinculada a actor/asociación y caduca; no crea solicitudes ni modifica Censo.
- La confirmación exige permiso `solicitudes:write`, flag transaccional, control humano explícito y una nueva validación bajo bloqueo.
- El registro crea un `registro pendiente` de tipo `cambio` y una solicitud administrativa real mediante el circuito ordinario. La escritura final en Censo sigue dependiendo de la validación administrativa existente.
- Reintentos y confirmaciones concurrentes son idempotentes.
- No se ha creado ninguna migración ni un sistema paralelo de permisos, persistencia o telemetría.

## Limitaciones y deuda conocida

- La primera versión asistida cubre cambios simples de identificación, nombre, apellidos, nacimiento, teléfono, email, dirección, código postal y cargos compatibles con las reglas actuales.
- Los cambios de cargo que requieren coordinación entre varias personas continúan en el flujo normal.
- El almacén temporal y algunos nombres internos se originaron en el workflow de altas; se reutilizan deliberadamente para evitar una migración, aunque convendrá generalizar su nomenclatura si aparecen más workflows.
- La telemetría se emite como eventos estructurados; no incluye dashboard propio y su explotación depende de la retención/consulta de logs del entorno.
- El feedback no ofrece texto libre para evitar una vía accidental de PII.
- La allowlist no tiene interfaz administrativa y el piloto real sigue pendiente de una decisión posterior.

## Validación local de RUBI-14

- Frontend: 93 pruebas en ChromeHeadless correctas.
- Frontend: build `development` correcto.
- API: 186 pruebas correctas.
- Contrato OpenAPI y `git diff --check` correctos.
- No se usó Gemini real, no se ejecutaron migraciones y no se modificó ningún entorno.

## Siguiente hito

- Siguiente hito previsto: `RUBI-15 — Bajas asistidas`.
- RUBI-15 no está iniciado.
