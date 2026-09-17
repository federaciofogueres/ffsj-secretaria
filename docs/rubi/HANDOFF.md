# Rubi — handoff entre agentes

Este documento es neutral respecto al agente (Codex, Claude Code u otro). La fuente canónica está en este directorio del repositorio `ffsj-secretaria`; la API relacionada vive en el repositorio hermano `ffsj-secretaria-api`.

## Antes de trabajar

1. Lee `docs/rubi/RUBI.md`.
2. Lee `docs/rubi/STATUS.md`.
3. Inspecciona `git status --short --branch` en cada repositorio afectado.
4. Inspecciona `git diff` y `git diff --cached` antes de editar.
5. Revisa el código y las pruebas relevantes; no deduzcas el estado solo por documentación o mensajes previos.
6. Conserva todos los cambios no commiteados.
7. No hagas operaciones Git destructivas.
8. No asumas que otro agente terminó correctamente: valida código, historial y pruebas.
9. Distingue los cambios del hito actual de cambios ajenos y no alteres estos últimos.
10. No despliegues, hagas commit/push, merge, PR ni toques entornos sin autorización expresa del prompt actual.

## Salvaguardas

- Prohibido `git reset --hard` y `git clean`.
- No uses `git restore`, `git checkout --` ni equivalentes para descartar trabajo existente.
- Producción es intocable sin autorización explícita. DEV y Azure tampoco se modifican por inferencia.
- No ejecutes migraciones locales o remotas sin revisar su necesidad; una migración nueva requiere la autorización exigida por el hito vigente.
- Preserva cambios, stashes y archivos ajenos aunque no pertenezcan al trabajo actual.
- Si documentación y código discrepan, prevalece el código y debe corregirse la documentación afectada.
- Mantén las garantías de permisos, scopes, privacidad, confirmación humana, idempotencia, budgets, retries y kill switches.

## Al terminar

- Ejecuta las pruebas y builds proporcionales a los repositorios modificados, validación OpenAPI si corresponde y `git diff --check`.
- Actualiza `docs/rubi/STATUS.md` cuando el hito cambie el estado funcional de Rubi, sus flags, capacidades o limitaciones.
- Modifica `docs/rubi/RUBI.md` solo cuando cambie una decisión arquitectónica o un principio permanente.
- Resume repositorios, archivos principales, validaciones, migraciones, riesgos y cualquier trabajo bloqueado. No marques un hito como completado si queda una decisión necesaria pendiente.
