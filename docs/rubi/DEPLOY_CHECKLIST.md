# Rubi — checklist de despliegue

> Para el USUARIO. Claude/el agente nunca ejecuta ninguno de estos pasos remotamente: no hace deploy, no toca Azure, no toca DEV/producción, no ejecuta migraciones. Esta lista es reutilizable en cada versión de Rubi que se decida llevar a un entorno real.

## 1. Branch/commit

- [ ] Confirmar la rama y el hash exacto de commit a desplegar en `ffsj-secretaria-api`.
- [ ] Confirmar la rama y el hash exacto de commit a desplegar en `ffsj-secretaria`.
- [ ] Confirmar que ambos commits son consistentes entre sí (mismo hito, misma versión `X.Y.0#RUBI` o `develop` tras su merge).

## 2. Tests

- [ ] API: suite completa en verde (`npm test`).
- [ ] Frontend: suite completa en verde (`npx ng test --watch=false --browsers=ChromeHeadless`).
- [ ] Evaluación determinista de Rubi en verde (`npm run rubi:eval`), provider `mock`.
- [ ] `git diff --check` limpio en ambos repositorios.

## 3. Build

- [ ] Build de producción del frontend genera sin errores (`ng build --configuration production` o el perfil que use el entorno destino).
- [ ] Contrato OpenAPI validado (`npm run openapi:check`).

## 4. Migraciones pendientes

- [ ] Ejecutar `SELECT version FROM secretaria_schema_migrations ORDER BY version` (o el equivalente ya usado en el proyecto) contra el entorno destino para saber qué migraciones faltan.
- [ ] Confirmar que ninguna migración pendiente ha sido modificada tras su creación (comparar contra el historial de git).
- [ ] Aplicar solo con el runner oficial del proyecto (`npm run db:migrate:dev` o el script equivalente del entorno), nunca a mano.
- [ ] Verificar tras aplicar: la tabla/columna esperada existe con el default esperado (deny-by-default donde aplique).

## 5. Variables/flags requeridos

- [ ] `RUBI_ENABLED` decidido explícitamente para el entorno destino (recomendado: `false` hasta completar el resto de esta checklist).
- [ ] `RUBI_PILOT_MODE_ENABLED`, `RUBI_PILOT_ACCESS_MODE`, `RUBI_PILOT_ACTOR_HASHES` decididos si el despliegue incluye activar el piloto (ver `PILOT.md`).
- [ ] `RUBI_TRANSACTIONAL_ENABLED`, `RUBI_REAL_PROVIDER_ENABLED` decididos (recomendado: mantener en `false` hasta el smoke test).
- [ ] `RUBI_PROVIDER`, `RUBI_MODEL` y la credencial del provider configurados en el gestor de secretos del entorno (nunca en texto plano en el repositorio).
- [ ] Límites (`RUBI_RATE_LIMIT_*`, `RUBI_CONCURRENCY_PER_ACTOR`, `RUBI_MAX_PROVIDER_CALLS`, `RUBI_MAX_RETRIES`) y presupuestos (`RUBI_DAILY_BUDGET_USD`, `RUBI_MONTHLY_BUDGET_USD`) revisados para el entorno destino.

## 6. Deploy API

- [ ] Desplegar `ffsj-secretaria-api` según el procedimiento habitual del proyecto (fuera del alcance de Claude).
- [ ] Confirmar que el proceso arranca sin errores y que las rutas no relacionadas con Rubi siguen respondiendo con normalidad.

## 7. Smoke API

- [ ] `GET /asistente/acceso` con un actor de prueba responde el estado esperado (`enabled`/`authorized` según lo configurado, nunca autorizado por sorpresa).
- [ ] Ver `SMOKE_TEST.md` para el resto de comprobaciones funcionales.

## 8. Deploy frontend

- [ ] Desplegar `ffsj-secretaria` según el procedimiento habitual del proyecto.
- [ ] Confirmar que la aplicación carga con normalidad para un usuario sin Rubi (Rubi debe ser invisible/no bloqueante si `enabled=false` o el actor no está autorizado).

## 9. Smoke frontend

- [ ] Ver `SMOKE_TEST.md`.

## 10. Habilitación controlada

- [ ] Seguir el orden de activación descrito en `PILOT.md` ("Activación — orden seguro"): migraciones → deploy → verificar acceso cerrado → autorizar solo a los participantes → smoke test → activar provider real al final.
- [ ] No activar `RUBI_PILOT_ACCESS_MODE=all` ni autorizar asociaciones fuera del grupo controlado decidido para el piloto.

## 11. Rollback

- [ ] Confirmar el plan de rollback (`docs/rubi/ROLLBACK.md`) antes de empezar, no después de detectar un problema.
- [ ] Confirmar que el equipo sabe qué kill switch usar según el tipo de incidente (ver `STATUS.md`, "Criterios de abortar el piloto").

---

Ninguno de los pasos anteriores se ejecuta desde una sesión de Claude. Esta checklist es una guía para quien realice el despliegue manualmente o mediante su pipeline habitual.
