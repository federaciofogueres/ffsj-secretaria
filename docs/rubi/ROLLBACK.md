# Rubi — rollback tras un despliegue

> Para el USUARIO. Un rollback de Rubi nunca debe implicar perder trámites/solicitudes/registros legítimos creados por asociados o por personal administrativo a través de los workflows normales. Este documento nunca sugiere borrar esos datos.

## Principio general

Revertir Rubi es, en el peor caso, revertir **código** (frontend y/o API a una versión anterior) más, opcionalmente, **desactivar** su acceso mediante los flags/kill switches ya existentes (ver `PILOT.md`). Revertir Rubi **no** implica:

- Borrar solicitudes, registros, incidencias o inscripciones creadas correctamente (esas son operaciones administrativas ordinarias de Secretaría, indistinguibles de las creadas sin Rubi una vez confirmadas).
- Revertir migraciones de base de datos en el caso general (ver más abajo).
- Perder historial de conversación (ya es efímero en memoria, con TTL; no hay nada que "revertir" ahí).

## Rollback de frontend

- Desplegar la versión anterior de `ffsj-secretaria`. Es independiente del rollback de API: el frontend anterior sigue funcionando contra una API más nueva (los endpoints de Rubi son aditivos, no reemplazan ninguno existente) y viceversa dentro de lo razonable.
- Si el rollback de frontend quita el panel de Rubi del build, el resto de la aplicación sigue funcionando con normalidad (Rubi no es una dependencia de ningún flujo administrativo existente).

## Rollback de API

- Desplegar la versión anterior de `ffsj-secretaria-api`.
- Una versión anterior de la API simplemente no expone las rutas `/asistente/*` ni `/admin/rubi/*` más recientes; el resto de endpoints de Secretaría (altas, modificaciones, registros, inscripciones, soporte...) no dependen de Rubi y siguen funcionando exactamente igual.
- Antes de revertir, confirmar que ninguna operación en curso (una preparación de alta/modificación/baja/Registro con TTL activo) queda en un estado inconsistente: al ser opacas y expirar por sí solas, una preparación abandonada simplemente caduca sin dejar el trámite creado; no requiere limpieza manual.

## Persistencia / migraciones

- El runner de migraciones (`scripts/migrate.js`) no tiene mecanismo de "down" (revertir una migración ya aplicada); solo hace rollback transaccional si una migración falla **durante** su propia ejecución.
- Todas las migraciones de Rubi (`055` → `061`) son **aditivas**: crean tablas nuevas o añaden columnas con default seguro (deny-by-default donde aplica). Ninguna elimina ni modifica datos existentes de otros dominios.
- Consecuencia práctica: revertir el **código** de Rubi a una versión anterior es seguro aunque el esquema de base de datos ya tenga las columnas/tablas nuevas — el código antiguo simplemente no las usa. **No es necesario ni recomendable revertir el esquema** para hacer un rollback de código.
- Si en algún momento futuro fuera estrictamente necesario revertir una columna/tabla concreta (no es el caso hoy), debe hacerse como una migración nueva explícita hacia adelante (ej. `062_revert_x.sql`), nunca editando ni borrando la migración original ya aplicada, y siempre evaluando primero si algún dato real (autorización de asociación, presupuesto consumido, confirmaciones pendientes) se perdería.

## Configuración de Rubi

- Toda la configuración operativa relevante (`enabled` global, `authorized` por asociación, `federation_authorized`, provider activo, transaccional) vive en tablas administradas desde el panel (`secretaria_rubi_config`, `secretaria_rubi_asociacion_config`) y se revierte con el propio panel o con los flags de infraestructura — no requiere ni deploy ni migración. Ver `PILOT.md` para el procedimiento exacto de cada kill switch.

## Provider

- Revertir el provider (volver a `mock` o desactivar `RUBI_REAL_PROVIDER_ENABLED`) es una variable de entorno, no un rollback de código ni de datos. No hay estado del provider que revertir: cada llamada es independiente y sin memoria server-side del proveedor externo.

## Datos administrativos ya creados mediante workflows normales

- Una solicitud de alta/modificación/baja o un registro de documentación/comunicación creados a través de Rubi (con confirmación humana) son **indistinguibles** de los creados por el flujo normal de Secretaría una vez confirmados: mismo circuito, misma tabla, mismas reglas de validación administrativa posterior.
- Un rollback de Rubi **nunca** debe traducirse en "borrar lo que Rubi ayudó a crear": esos trámites siguen su ciclo de vida administrativo ordinario, revisado por el personal correspondiente, exactamente igual que si se hubieran creado sin pasar por el asistente.
