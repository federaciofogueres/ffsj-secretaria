# Rubi — estado actual

> Este archivo describe el estado actual. Si contradice al código, prevalece el código.

## Versión y alcance

- Rama de frontend y API: `1.0.0#RUBI`.
- Último hito funcional: RUBI-13, cerrado y validado en código/local.
- Último estado desplegado conocido: RUBI-12 validado correctamente en DEV. RUBI-13 no se ha desplegado ni activado en ningún entorno.
- Único workflow administrativo asistido: alta. No hay bajas, modificaciones ni nuevos trámites implementados por Rubi.
- `1.0.0#RUBI` queda cerrada funcionalmente como base de Rubi. El piloto real se pospone y no bloquea la siguiente versión.

## Disponible hoy

- Conversación contextual en ES/VA/EN, FAQ/Knowledge Base y ayuda sobre la pantalla actual.
- Navegación solo a destinos internos registrados.
- Permisos, scope de asociación y catálogo dinámico de capabilities/tools resueltos por backend.
- Provider Gemini seleccionable por configuración, con fallback determinista, límites, presupuesto, timeout, retry acotado y telemetría de consumo.
- Alta asistida estructurada: recopilación local de PII, preparación determinista, revisión, confirmación humana, idempotencia, revalidación y registro de la solicitud administrativa real.
- Privacidad: PII fuera del provider, historial efímero en memoria y logs/telemetría sin texto de conversación ni payload completo.
- Infraestructura de piloto disponible en código: launcher oculto fuera de la allowlist, protección equivalente en conversación y rutas de alta, kill switch global y acceso configurable sin cambiar código. Está desactivada/no configurada remotamente.
- Feedback útil/no útil exclusivamente estructurado, preparado para una futura apertura del piloto.
- Funnel agregable por sesión efímera seudonimizada: apertura, conversación/intención, tool, navegación, alta iniciada, preparada, registrada, cancelada y errores categorizados.

## Configuración relevante

Los valores efectivos pertenecen al entorno y no deben copiarse a documentación:

- Acceso: `RUBI_ENABLED`, `RUBI_PILOT_ACCESS_MODE`, `RUBI_PILOT_ACTOR_HASHES`.
- Persistencia: `RUBI_TRANSACTIONAL_ENABLED`.
- Provider: `RUBI_REAL_PROVIDER_ENABLED`, `RUBI_PROVIDER`, `RUBI_MODEL` y la credencial del provider.
- Tools y contexto: `RUBI_ALLOWED_TOOLS`, máximos de mensaje, entrada, salida, historial y contexto.
- Resiliencia: timeout, llamadas máximas, retries y demora base.
- Protección de uso: límites por minuto/día/concurrencia y presupuestos diario/mensual.

El modo de piloto por defecto es `allowlist` y una lista vacía no autoriza a nadie. `admin:access` no concede acceso al piloto. Los elementos de la allowlist son claves seudonimizadas de 16 caracteres emitidas por la telemetría de comprobación de acceso (o el hash SHA-256 completo), nunca nombres, documentos, emails o tokens.

## Limitaciones y deuda conocida

- La telemetría de funnel del piloto se emite como eventos estructurados en la observabilidad actual; RUBI-13 no incluye dashboard. Su explotación depende de la retención y consulta de logs del entorno.
- El feedback inicial no ofrece comentario libre para evitar una nueva vía de PII.
- La allowlist no tiene interfaz administrativa: se opera mediante configuración del entorno y no se activa desde código.
- Las respuestas abiertas siguen dependiendo de la calidad/disponibilidad del provider; navegación, seguridad y alta sensible conservan límites deterministas.
- El piloto real queda pendiente de una decisión posterior; no se abre ni se configura como parte del cierre de `1.0.0#RUBI`.

## Validación local de RUBI-13

- Frontend: 87 pruebas en ChromeHeadless y build `development` correctos.
- API: 176 pruebas correctas.
- Contrato OpenAPI y `git diff --check` correctos.
- No se usó Gemini real, no se ejecutaron migraciones y no se modificó ningún entorno.

## Siguiente versión e hito

- Siguiente versión prevista: `1.1.0#RUBI`.
- Siguiente hito previsto: `RUBI-14 — Modificaciones asistidas`.
- Después: `RUBI-15 — Bajas asistidas`.
- Ninguno de ellos está iniciado en esta rama de cierre.
