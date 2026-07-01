# ffsj-secretaria

Aplicacion Angular 20 para la nueva gestion de secretaria de la Federacio de Les Fogueres de Sant Joan. Este proyecto sustituye progresivamente funcionalidades de la intranet antigua (`web-intranet`) relacionadas con asociaciones, asociados, inscripciones y registro documental.

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Arranca el servidor local:

```bash
npm start
```

Tambien puedes usar explicitamente:

```bash
npm run start:local
```

Abre `http://localhost:4200/`. La aplicacion se recargara automaticamente al modificar archivos.

## Entornos

El proyecto tiene configuraciones Angular explicitas para local, test, desarrollo y produccion:

| Entorno | Serve command | Build command | Fichero de entorno |
| --- | --- | --- | --- |
| Local | `npm run start:local` | `npm run build:local` | `src/environments/environment.local.ts` |
| Test | `npm run start:test` | `npm run build:test` | `src/environments/environment.test.ts` |
| Desarrollo | `npm run start:dev` | `npm run build:dev` | `src/environments/environment.development.ts` |
| Produccion | `npm run start:prod` | `npm run build:prod` | `src/environments/environment.production.ts` |

`npm run build` genera produccion por defecto. Las URLs de API y ficheros se configuran en cada entorno mediante `API_BASE_PATH` y `FILES_BASE_PATH`.

## Modulos actuales

- **Inicio**: pantalla de entrada con accesos a los modulos principales.
- **Asociados**: listado, busqueda, paginacion, detalle y exportacion Excel de asociados adultos e infantiles. Actualmente usa datos mock.
- **Gestion de asociados**: interfaz para preparar altas, modificaciones y bajas. Actualmente simula pendientes en cliente.
- **Asociacion**: consulta y edicion de datos oficiales, contacto, sede y datos publicos de la asociacion. Actualmente usa datos mock.
- **Inscripciones**: listado de formularios disponibles, seleccion de asociados y envio simulado de inscripciones.
- **Registro**: presentacion de documentacion y comunicaciones con adjuntos, generando referencias simuladas.

## Pendiente de integracion

La aplicacion aun no esta conectada a una API de secretaria. La integracion debera sustituir mocks por servicios HTTP, reutilizando los valores de `src/environments/*` y manteniendo la separacion de entornos ya definida.

Consulta `funcionalidades.MD` para el backlog funcional recomendado y prompts preparados para ir pasandoselos a Codex por fases.

## Comandos utiles

```bash
npm run build
npm test
```
