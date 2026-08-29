# ffsj-secretaria

Nueva aplicación Angular 20 para la gestión de secretaría de la Federació de Fogueres de Sant Joan (FFSJ). Sustituye progresivamente funciones de la intranet antigua: gestión de asociados y asociación, calendario, inscripciones, formularios, registro documental, solicitudes y administración de permisos.

## Relación con el workspace

- Consume `ffsj-secretaria-api` para los módulos propios de secretaría en `http://localhost:3001/emjf1/Secretaria/1.0.0` en local.
- Consume `ffsj-new-censo-api` para el censo en `http://localhost:8080/emjf1/Censo-Hogueras/1.0.0` en local.
- Usa la librería Angular empaquetada `ffsj-web-components`, incluida en `src/lib/ffsj-web-components`.

## Requisitos

- Node.js **20.19 o 22.12 o posterior**, requisito de Angular CLI 20.
- npm.
- Las dos APIs anteriores en ejecución para probar integraciones reales.

## Arranque local

```powershell
npm ci
npm run start:local
```

Abre `http://localhost:4200/`. La configuración local está en `src/environments/environment.local.ts` y define por separado `CENSO_API_BASE_PATH`, `SECRETARIA_API_BASE_PATH` y la ruta de ficheros.

> Si `npm ls` informa que `ffsj-web-components` apunta a otro directorio, elimina solo `node_modules` y ejecuta `npm ci` con Node compatible: la dependencia correcta es la copia incluida en este repositorio.

## Entornos y comandos

| Entorno | Servidor | Compilación |
| --- | --- | --- |
| Local | `npm run start:local` | `npm run build:local` |
| Test | `npm run start:test` | `npm run build:test` |
| Desarrollo | `npm run start:dev` | `npm run build:dev` |
| Producción | `npm run start:prod` | `npm run build:prod` |

`npm run build` genera producción y `npm test` ejecuta Karma.

## Módulos

- **Asociados y asociación**: consulta, altas, cambios y bajas vinculados al censo.
- **Calendario, inscripciones y formularios**: publicación y participación en actividades.
- **Registro**: documentación y comunicaciones.
- **Solicitudes**: revisión, validación y seguimiento de peticiones.
- **Administración**: permisos y roles.

## Estructura

- `src/app/`: componentes, rutas, guards y servicios de la aplicación.
- `src/environments/`: URLs por entorno.
- `src/lib/ffsj-web-components/`: distribución local de componentes compartidos.
- `funcionalidades.MD` y `features-*.MD`: backlog y planificación funcional.
