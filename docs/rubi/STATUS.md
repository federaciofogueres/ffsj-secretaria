# Rubi — estado actual

> Este archivo describe el estado actual. Si contradice al código, prevalece el código.

## Versión y alcance

- Rama de frontend y API: `1.1.0#RUBI`.
- Estado de la versión: **EN DESARROLLO**. `1.1.0#RUBI` no está cerrada.
- Último hito funcional: RUBI-15.1 — Centro de administración y control de Rubi, implementado y validado en código/local.
- Plan de la versión: RUBI-14, RUBI-15 y RUBI-15.1 completados. La versión se cerrará mediante la skill de cierre de versión en un prompt posterior.
- Último estado desplegado conocido: RUBI-12 validado en DEV. RUBI-13, RUBI-14, RUBI-15 y RUBI-15.1 no se han desplegado ni activado en ningún entorno.
- Workflows administrativos asistidos: altas, modificaciones y bajas de personas.
- La infraestructura de piloto de RUBI-13 se conserva disponible, desactivada/no configurada remotamente, y ahora convive con la configuración administrada de RUBI-15.1 (ver más abajo).

## Disponible hoy

- Conversación contextual en ES/VA/EN, FAQ/Knowledge Base y ayuda sobre la pantalla actual.
- Navegación solo a destinos internos registrados.
- Permisos, scope de asociación y catálogo dinámico de capabilities/tools resueltos por backend.
- Gemini como provider actual seleccionable por configuración, con fallback determinista, límites, presupuesto, timeout, retry acotado y telemetría de consumo.
- Alta asistida estructurada: recopilación local de PII, preparación determinista, revisión, confirmación humana, idempotencia, revalidación y registro de la solicitud administrativa real.
- Modificación asistida de una persona activa: selección estructurada, estado actual, edición de campos permitidos, resumen antes/después, preparación, confirmación humana, revalidación y creación del trámite administrativo ordinario de cambio.
- Baja asistida de una persona activa: selección estructurada, carga del estado real desde Censo (incluidos cargos), motivo opcional, resumen previo a confirmar, confirmación humana, revalidación y creación del trámite administrativo ordinario de baja.
- Los cambios complejos de cargos —sustituciones obligatorias, transferencias o falta de plazas— se derivan al flujo normal existente. Una baja de una persona que ocupa un cargo obligatorio también se deriva al flujo normal.
- La confirmación de altas, modificaciones y bajas se realiza desde Angular contra la API. Gemini solo puede proponer abrir el formulario seguro; no prepara, confirma, registra ni escribe en Censo.
- Privacidad: PII fuera del provider, historial efímero en memoria y logs/telemetría sin texto sensible ni payloads administrativos completos.
- Infraestructura de piloto: allowlist seudonimizada, kill switch, feedback estructurado y funnel agregable para conversación, navegación, altas, modificaciones y bajas.
- Centro de administración de Rubi (Configuración → RUBI, RUBI-15.1): habilitar/deshabilitar Rubi globalmente, el uso del provider real y las operaciones transaccionales; habilitar/deshabilitar Rubi por asociación con búsqueda y filtro; estado del provider (proveedor, modelo, kill switch, si la credencial está configurada, sin revelarla nunca); estado del presupuesto diario/mensual y porcentaje consumido; una primera vista de analíticas (llamadas, tokens, coste estimado, fallidas, actores y asociaciones únicas) filtrable por periodo y asociación.

## Configuración relevante

Los valores efectivos pertenecen al entorno y no deben copiarse a documentación:

- Acceso: `RUBI_ENABLED`, `RUBI_PILOT_ACCESS_MODE`, `RUBI_PILOT_ACTOR_HASHES`.
- Persistencia: `RUBI_TRANSACTIONAL_ENABLED`.
- Provider: `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_PROVIDER`, `RUBI_MODEL` y la credencial del provider.
- Tools y contexto: `RUBI_ALLOWED_TOOLS`, máximos de mensaje, entrada, salida, historial y contexto.
- Resiliencia: timeout, llamadas máximas, retries y demora base.
- Protección de uso: límites por minuto/día/concurrencia y presupuestos diario/mensual.

El modo de piloto por defecto es `allowlist` y una lista vacía no autoriza a nadie. `admin:access` no concede acceso al piloto. Los elementos de la allowlist son claves seudonimizadas, nunca nombres, documentos, emails o tokens.

## Centro de administración de Rubi (RUBI-15.1)

- Nuevo permiso `admin:rubi` gobierna quién puede leer/modificar la configuración administrada; es independiente de `admin:access` y `admin:permissions`.
- Modelo de autorización ordinario: kill switch de infraestructura (`RUBI_ENABLED`, `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_TRANSACTIONAL_ENABLED`) → configuración global administrada → asociación con acceso → allowlist del piloto (si sigue activa) → permisos/scope/capabilities reales del usuario. Que una asociación tenga Rubi activada no concede por sí sola capabilities transaccionales; siguen dependiendo de `solicitudes:write`.
- Persistencia nueva (migraciones `057_rubi_admin_config.sql` y `058_rubi_usage_asociacion.sql`, ejecutadas manualmente por el usuario en DEV):
  - `secretaria_rubi_config`: fila única con el estado operativo global (`enabled`, `real_provider_enabled`, `transactional_enabled`), todos `true` por defecto para no desactivar Rubi de forma implícita.
  - `secretaria_rubi_asociacion_config`: acceso por asociación (`enabled`); una asociación sin fila se considera habilitada por defecto (no desaparece por no estar configurada explícitamente).
  - `secretaria_rubi_usage` gana la columna `asociacion_id` para poder atribuir consumo a la asociación autenticada; los registros anteriores a esta migración quedan sin asociación.
- La API key del provider y el resto de secretos permanecen exclusivamente en variables de entorno; el panel solo expone si la credencial está configurada, nunca su valor.
- La allowlist de RUBI-13 (`RUBI_PILOT_ACCESS_MODE`/`RUBI_PILOT_ACTOR_HASHES`) se conserva como mecanismo adicional/alternativo de piloto o emergencia; no se ha eliminado. El acceso ordinario recomendado a partir de RUBI-15.1 combina esta allowlist (o `RUBI_PILOT_ACCESS_MODE=all` si se decide abrir el acceso a todos los actores autenticados) con el nuevo control global/por asociación administrado desde Secretaría.
- La lectura de la configuración administrada (`/asistente/acceso` y el middleware que protege los endpoints de Rubi) es *fail-open*: si la tabla o la base de datos no están disponibles (por ejemplo, si la migración aún no se ha ejecutado en un entorno), Rubi se comporta exactamente igual que antes de RUBI-15.1, sin bloquear accesos ya autorizados por el kill switch y la allowlist.
- Endpoints administrativos nuevos, protegidos por `admin:rubi`: `GET/PUT /admin/rubi/config`, `GET /admin/rubi/asociaciones`, `PUT /admin/rubi/asociaciones/{asociacionId}`, `GET /admin/rubi/analiticas`.
- Analíticas: se calculan exclusivamente a partir de `secretaria_rubi_usage` (llamadas, tokens, coste estimado, fallidas, actores y asociaciones únicas), sin contenido conversacional ni PII. Los contadores de conversaciones iniciadas por workflow (altas/modificaciones/bajas), cancelaciones y feedback útil/no útil **no** están disponibles todavía como analítica consultable: `RubiPilotTelemetry` sigue siendo solo de log (no persistido en tabla alguna), así que esa información no se inventa ni se expone en el panel; queda como deuda pendiente si se necesita en el futuro.

## Garantías del workflow de modificaciones

- El backend obtiene de Censo el estado actual y valida asociación, persona, ejercicio, campos, duplicados y cargos.
- La preparación es temporal, opaca, vinculada a actor/asociación y caduca; no crea solicitudes ni modifica Censo.
- La confirmación exige permiso `solicitudes:write`, flag transaccional, control humano explícito y una nueva validación bajo bloqueo.
- El registro crea un `registro pendiente` de tipo `cambio` y una solicitud administrativa real mediante el circuito ordinario. La escritura final en Censo sigue dependiendo de la validación administrativa existente.
- Reintentos y confirmaciones concurrentes son idempotentes.
- No se ha creado ninguna migración ni un sistema paralelo de permisos, persistencia o telemetría.

## Garantías del workflow de bajas (RUBI-15)

- El backend obtiene de Censo el estado actual de la persona (datos y cargos) y valida asociación, persona, ejercicio y duplicados con las mismas funciones reutilizadas de altas/modificaciones (`resolveEjercicioOperativoAlta`, `getAsociadoParaModificacion`, `findDuplicatedRegistroPendiente`, `findOpenSolicitudByAsociado`).
- Si la persona ocupa un cargo obligatorio, la preparación se deriva al flujo normal (`CARGO_OBLIGATORIO_REQUIERE_SUSTITUCION`) en lugar de resolver automáticamente una sustitución coordinada.
- La preparación reutiliza íntegramente `AltaConfirmationStore` (misma tabla, TTL, opacidad, vinculación a actor/asociación y protección ante manipulación que altas y modificaciones); no se ha creado un almacén ni una tabla nuevos.
- La confirmación exige permiso `solicitudes:write`, flag transaccional, control humano explícito desde Angular y una revalidación completa bajo bloqueo (incluye recomprobar cargos obligatorios y el hash de contenido).
- El registro crea un `registro pendiente` de tipo `baja` y una solicitud administrativa real mediante el circuito ordinario (`createBajaTramite`, análogo a `createCambioTramite`). La escritura final en Censo (desactivar el histórico) sigue dependiendo exclusivamente de la validación administrativa existente; Rubi no escribe en Censo.
- Reintentos y confirmaciones concurrentes son idempotentes (mismo mecanismo de bloqueo y replay que altas/modificaciones).
- La capability `baja.start` y la tool `start_baja` siguen el mismo patrón de permisos y allowlist que `alta.start`/`modificacion.start`.
- No se ha creado ninguna migración ni un sistema paralelo de permisos, persistencia o telemetría.

## Limitaciones y deuda conocida

- La primera versión asistida cubre cambios simples de identificación, nombre, apellidos, nacimiento, teléfono, email, dirección, código postal y cargos compatibles con las reglas actuales.
- Los cambios de cargo que requieren coordinación entre varias personas continúan en el flujo normal, igual que las bajas de personas con un cargo obligatorio.
- El almacén temporal y algunos nombres internos se originaron en el workflow de altas; se reutilizan deliberadamente para evitar una migración y ahora los comparten altas, modificaciones y bajas, aunque convendrá generalizar su nomenclatura si aparecen más workflows.
- La telemetría se emite como eventos estructurados; no incluye dashboard propio y su explotación depende de la retención/consulta de logs del entorno.
- El feedback no ofrece texto libre para evitar una vía accidental de PII.
- La allowlist no tiene interfaz administrativa propia (se mantiene por variables de entorno), aunque el acceso ordinario ya no depende exclusivamente de ella gracias al centro de administración de RUBI-15.1.
- El flujo normal de bajas admite cesión coordinada de un cargo obligatorio a otra persona en el mismo trámite; la baja asistida por Rubi no reproduce esa coordinación y deriva siempre esos casos al flujo normal.
- El presupuesto diario/mensual sigue siendo global (por despliegue), configurado por variable de entorno; el panel muestra su consumo y porcentaje pero no permite todavía definir un presupuesto o hard cap distinto por asociación (solo el acceso on/off por asociación).
- Las analíticas administrativas se limitan a lo que `secretaria_rubi_usage` puede responder hoy (llamadas, tokens, coste, fallidas, actores/asociaciones únicas). Conversaciones iniciadas, workflows por tipo, cancelaciones y feedback útil/no útil siguen sin persistirse de forma consultable (solo como logs de `RubiPilotTelemetry`); ampliarlo requeriría una tabla de eventos nueva, deliberadamente no creada en este hito para no inventar métricas no soportadas.
- El consumo por asociación solo puede atribuirse a partir de la fecha de esta migración; los registros históricos de `secretaria_rubi_usage` anteriores no tienen `asociacion_id`.

## Validación local de RUBI-15.1

- Frontend: 113 pruebas en ChromeHeadless correctas (101 previas + 12 nuevas del centro de administración de Rubi).
- Frontend: build `development` correcto.
- API: 206 pruebas correctas (195 previas + 11 nuevas del centro de administración de Rubi).
- Contrato OpenAPI (`/admin/rubi/config`, `/admin/rubi/asociaciones`, `/admin/rubi/asociaciones/{asociacionId}`, `/admin/rubi/analiticas`) y `git diff --check` correctos en ambos repositorios.
- No se usó Gemini real; las migraciones `057_rubi_admin_config.sql` y `058_rubi_usage_asociacion.sql` están incluidas en Git y fueron ejecutadas manualmente por el usuario en DEV. No se ejecutaron migraciones desde este trabajo.

## Siguiente hito

- RUBI-14, RUBI-15 y RUBI-15.1 están completados en código y validados localmente.
- `1.1.0#RUBI` permanece abierta; su cierre formal se realizará mediante la skill de cierre de versión en un prompt posterior.
- No corresponde iniciar RUBI-16 ni ninguna versión posterior todavía.
