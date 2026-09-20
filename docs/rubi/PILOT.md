# Rubi — runbook operativo del piloto

> Documento operativo para el USUARIO. Claude/el agente no ejecuta ninguno de estos pasos: no despliega, no activa el piloto, no toca variables de entorno reales ni bases de datos remotas. Este documento explica cómo hacerlo con seguridad cuando el usuario decida activar el piloto.

> No contiene secretos ni valores reales de credenciales. Cuando se menciona una variable de entorno se explica su efecto, nunca su valor en un entorno concreto.

## Antes del piloto

### 1. Checks técnicos

- Rama y commit exactos que se van a desplegar, en ambos repositorios (`ffsj-secretaria`, `ffsj-secretaria-api`).
- Suite de tests completa en verde (API y frontend), build `development`/`production` correcto, `git diff --check` limpio, contrato OpenAPI validado (`npm run openapi:check`).
- Evaluación determinista de Rubi (`npm run rubi:eval`) en verde con provider `mock`, sin usar el provider real.

### 2. Migraciones

- Confirmar con el runner (`npm run db:migrate:dev` o equivalente en el entorno destino) qué migraciones de `scripts/migrations/` quedan pendientes en ese entorno concreto. El runner (`scripts/migrate.js`) solo ejecuta las que no constan en `secretaria_schema_migrations`; es idempotente por diseño.
- Las migraciones relevantes para Rubi son `055` → `061` (confirmaciones de alta, uso/telemetría, configuración administrada, autorización por asociación, confirmaciones de Registro, autorización de Federación). Todas están auditadas: orden lineal, cada una depende solo del estado inmediatamente anterior, ninguna modifica una migración ya aplicada, los defaults nuevos son siempre deny-by-default o no destructivos.
- Aplicar migraciones es un acto explícito del usuario sobre el entorno destino. Este documento no las ejecuta ni las asume aplicadas.

### 3. Variables/flags de infraestructura

Variables de entorno relevantes (ver `.env.template` para el nombre exacto y su valor por defecto; ninguno de esos valores se documenta aquí como "el correcto", cada entorno decide el suyo):

| Variable | Efecto |
|---|---|
| `RUBI_ENABLED` | Interruptor maestro. En `false`, Rubi no responde nada (503) antes incluso de resolver actor/asociación. |
| `RUBI_PILOT_MODE_ENABLED` | Activa el modo piloto explícito (allowlist adicional). En `false` (modo normal), el acceso depende solo de `enabled`/`authorized` administrados desde el panel. |
| `RUBI_PILOT_ACCESS_MODE` | `allowlist` (por defecto) o `all`. Con `allowlist`, solo los actores en `RUBI_PILOT_ACTOR_HASHES` acceden; con lista vacía, nadie accede. |
| `RUBI_PILOT_ACTOR_HASHES` | Lista de claves seudonimizadas (nunca nombres/documentos/emails/tokens) autorizadas cuando el modo piloto está activo. |
| `RUBI_TRANSACTIONAL_ENABLED` | Permite o bloquea la confirmación humana de operaciones persistentes (alta, modificación, baja, Registro). En `false`, Rubi sigue conversando/navegando pero no puede confirmar ninguna operación. |
| `RUBI_REAL_PROVIDER_ENABLED` | Permite o bloquea la llamada al provider real (Gemini u otro). En `false`, solo funciona lo que el router determinista resuelve sin provider. |
| `RUBI_PROVIDER` / `RUBI_MODEL` | Provider y modelo activos. |
| `RUBI_BLOCKED_TOOLS` | Lista de bloqueo puntual de tools concretas (vacía por defecto). |
| `RUBI_RATE_LIMIT_PER_MINUTE` / `RUBI_RATE_LIMIT_PER_DAY` / `RUBI_CONCURRENCY_PER_ACTOR` | Límites de uso por actor. |
| `RUBI_DAILY_BUDGET_USD` / `RUBI_MONTHLY_BUDGET_USD` | Presupuesto del provider real; `0` desactiva el límite (sin tope). |

### 4. Provider

- Confirmar que la credencial del provider real está configurada en el entorno destino (el panel de administración solo indica si está configurada, nunca su valor).
- Confirmar `timeout`, reintentos (máximo 1, acotado) y límites de tokens de entrada/salida/mensaje/historial/contexto son los deseados para el piloto.
- No se prueba el provider real desde este documento ni desde ninguna sesión de Claude: toda validación técnica de este hito usa el provider `mock`.

### 5. Presupuesto

- Definir `RUBI_DAILY_BUDGET_USD`/`RUBI_MONTHLY_BUDGET_USD` antes de activar el provider real. Con presupuesto agotado, el comportamiento es degradar de forma segura (ver "Control de costes" más abajo), nunca bloquear el resto de la aplicación.

### 6. Asociaciones autorizadas

- Desde Configuración → RUBI (permiso `admin:rubi`): autorizar explícitamente cada asociación participante (`authorized`). Una asociación sin autorización explícita no tiene acceso (deny-by-default), independientemente de cualquier otro flag.

### 7. Federación

- Si el piloto incluye al actor Federación/Administración, activar el interruptor «Acceso de Federación/Administración autorizado» (`federation_authorized`) desde el mismo panel. Es independiente de la autorización por asociación: autorizar asociaciones no autoriza a Federación, y viceversa.

### 8. Allowlist del piloto

- Si se activa `RUBI_PILOT_MODE_ENABLED=true`, construir `RUBI_PILOT_ACTOR_HASHES` con las claves seudonimizadas de los participantes reales del piloto. Una lista vacía con el modo piloto activo significa que **nadie** tiene acceso (verificado exhaustivamente en `test/rubi.pilot.matrix.test.js`, RUBI-23).

## Activación — orden seguro

1. Aplicar migraciones pendientes en el entorno destino (si las hay).
2. Desplegar API y frontend (fuera del alcance de este documento y de Claude).
3. Con `RUBI_ENABLED=true` pero **antes** de autorizar ninguna asociación: confirmar `GET /asistente/acceso` responde `enabled=true, authorized=false` para un actor de prueba (nadie tiene acceso todavía).
4. Autorizar únicamente las asociaciones/Federación que participan en el piloto desde el panel admin.
5. Si se usa modo piloto explícito, activar `RUBI_PILOT_MODE_ENABLED=true` con la allowlist ya cargada.
6. Confirmar con el smoke test (`SMOKE_TEST.md`) que el acceso es exactamente el esperado: los participantes entran, el resto no.
7. Activar `RUBI_REAL_PROVIDER_ENABLED=true` solo al final, cuando el resto ya está verificado.

Este orden evita el escenario de riesgo real: activar el provider real o la autorización antes de tener la allowlist/asociaciones correctamente acotadas.

## Durante el piloto

### Qué observar

- Eventos estructurados de `RubiPilotTelemetry` (`access_checked`, `session_opened`, `flow_started`, `flow_cancelled`, `navigation`, `feedback`, `insights`) y de logging técnico del gateway (`rubi_request_completed`, `rubi_provider_attempt`, `rubi_request_failed`, `rubi_usage_reconciliation_failed`) en los logs del entorno. Ninguno contiene texto de conversación ni PII (ver `docs/rubi/STATUS.md` y los tests de privacidad de cada hito).
- Analíticas del panel admin (`GET /admin/rubi/analiticas`): llamadas, tokens, coste estimado, fallidas, actores y asociaciones únicas, filtrable por periodo/asociación.
- Estado del presupuesto diario/mensual y porcentaje consumido, visible en el mismo panel.
- Feedback estructurado (`helpful`/`not_helpful`) asociado a intent/tool, sin texto libre.

### Cómo detectar fallos

- Tasa de `rubi_request_failed` y de `success:false` en `rubi_provider_attempt` con `errorCode` — el código de error es el diagnóstico, no requiere reproducir el mensaje del usuario.
- Analíticas con `fallidas` creciendo de forma anómala respecto a `llamadas`.
- Reportes directos de usuarios del piloto contrastados contra el checklist de "Criterios de abortar" (`STATUS.md`/este documento).

### Cómo bloquear una tool

- Añadir su nombre exacto (p. ej. `start_baja`) a `RUBI_BLOCKED_TOOLS` (lista separada por comas) y reiniciar/recargar configuración según el mecanismo del entorno. No requiere deploy de código: es una variable de entorno de infraestructura. Efecto inmediato y probado en `test/rubi.killswitch.test.js` (nivel 1).

### Cómo desactivar transacciones

- `RUBI_TRANSACTIONAL_ENABLED=false`. Rubi sigue conversando, navegando y consultando datos de lectura, pero ninguna confirmación humana de alta/modificación/baja/Registro se acepta (`RUBI_TRANSACTIONAL_DISABLED`). Nivel 2 del kill switch.

### Cómo desactivar el provider real

- `RUBI_REAL_PROVIDER_ENABLED=false`. Lo que el router determinista resuelve sin provider sigue funcionando (ayuda, navegación, alta/modificación/baja explícitas, consultas de comunicaciones/actividades/calendario, sugerencias proactivas); lo que exigiría al provider real responde `RUBI_REAL_PROVIDER_DISABLED`. Nivel 3.

### Cómo desactivar Rubi por completo

- `RUBI_ENABLED=false` (infraestructura) o el interruptor global `enabled` del panel admin (Configuración → RUBI). Cualquiera de los dos corta el acceso antes de resolver actor/asociación/permisos. Nivel 4, el más agresivo. Ver "Criterios de abortar" para cuándo usar este nivel frente a uno más quirúrgico.

## Después del piloto

1. Recoger resultados: analíticas del panel admin, feedback útil/no útil agregado por intent/tool, incidencias reportadas manualmente.
2. Revisar el feedback junto con las métricas realmente disponibles (ver `docs/rubi/STATUS.md`, sección "Métricas del piloto" — no existen métricas que no estén ya listadas ahí).
3. Decidir, con esos datos, una de tres salidas: continuar ampliando el piloto, corregir defectos concretos encontrados y repetir una campaña acotada, o parar y revertir la autorización (retirar `authorized`/`federation_authorized`, sin necesidad de deploy).
4. Ninguna decisión de este documento se toma automáticamente: es siempre una decisión humana informada por los datos.
