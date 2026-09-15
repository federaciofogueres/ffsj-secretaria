# Auditoría de loaders

Las cargas asíncronas de pantallas, listados, formularios y paneles usan `lib-ffsj-spinner` de `ffsj-web-components`.

## Excepciones justificadas

- `app.component.html`: el indicador de envío de «Iniciar ejercicio» permanece como `spinner-border-sm` dentro del botón. El componente común ocupa 200 px y contiene imagen, por lo que no es compatible con un botón compacto.
- `registro.component.html`: los indicadores de envío de documentación y comunicación permanecen como `spinner-border-sm` por la misma razón; son estado de una acción bloqueada, no loaders de pantalla.
- `tasks-loading-dot` no es un loader: sólo marca de forma no bloqueante que el contador de tareas se está actualizando.
