# Rubi — plan de smoke test post-despliegue

> Para el USUARIO, tras un despliegue real. Objetivo: 10-20 minutos, no cientos de casos. Cada punto es un "funciona / no funciona", no una validación funcional exhaustiva (para eso existe `REGRESSION_PLAN.md`).

Marcar cada punto con el resultado real observado, nunca por inferencia.

## 1. Login de asociación (2 min)

- [ ] Iniciar sesión con una asociación autorizada para el piloto.
- [ ] La aplicación carga con normalidad (Rubi no bloquea ni ralentiza el resto de Secretaría).

## 2. Launcher (1 min)

- [ ] El botón/avatar de Rubi aparece solo si el actor está autorizado (`accessGranted`).
- [ ] Con una asociación NO autorizada, el launcher no aparece o Rubi responde no disponible.

## 3. Saludo/capabilities (2 min)

- [ ] Abrir Rubi: aparece el mensaje de bienvenida.
- [ ] Preguntar "¿Qué puedes hacer?" o equivalente: responde con las capacidades reales de esa asociación, sin inventar ni prometer autonomía.

## 4. Lectura (2 min)

- [ ] Preguntar por comunicaciones nuevas: responde con datos reales (o "no tienes comunicaciones nuevas"), nunca inventados.
- [ ] Preguntar por el calendario/actividades: responde con datos reales.

## 5. Workflow transaccional (3 min)

- [ ] Pedir iniciar un alta (o modificación/baja): Rubi abre el formulario estructurado, nunca confirma nada por sí sola.
- [ ] Confirmar la operación desde el formulario real (con datos de prueba, no reales) y verificar que se crea el trámite/solicitud esperado.
- [ ] Si `RUBI_TRANSACTIONAL_ENABLED=false`: la confirmación se rechaza explícitamente (no se cuelga, no error genérico opaco).

## 6. Registro (1 min)

- [ ] Pedir presentar documentación o enviar una comunicación: Rubi abre el formulario correspondiente.

## 7. Inscripción (1 min)

- [ ] Preguntar por una actividad con inscripción abierta: Rubi ofrece iniciar la inscripción y abre el formulario real, nunca la envía por sí sola.

## 8. Soporte (1 min)

- [ ] Pedir abrir una incidencia de soporte: Rubi abre `/soporte`, no crea la incidencia desde el chat.

## 9. Federación (si el piloto la incluye, 2 min)

- [ ] Iniciar sesión como actor Federación/Administración autorizado.
- [ ] Sin asociación objetivo seleccionada: Rubi no muestra datos de ninguna asociación concreta.
- [ ] Con una asociación objetivo seleccionada: Rubi muestra únicamente datos de esa asociación.

## 10. Cambio de asociación objetivo (Federación, 1 min)

- [ ] Cambiar de asociación objetivo A → B: la conversación y las sugerencias se limpian, no aparece ningún dato de A tras el cambio.

## 11. Sugerencias/insights (1 min)

- [ ] Al abrir el panel, si hay algo relevante (comunicación nueva, plazo próximo, solicitud pendiente), aparece como sugerencia informativa.
- [ ] Pulsar una sugerencia navega/abre el flujo correspondiente, nunca ejecuta nada directamente.

## 12. Kill switches (3 min)

- [ ] Con `RUBI_BLOCKED_TOOLS` incluyendo una tool conocida (p. ej. `start_soporte`), esa acción deja de ofrecerse/ejecutarse y Rubi degrada a informar.
- [ ] Con `RUBI_ENABLED=false` (o `enabled` global apagado desde el panel admin), Rubi deja de estar disponible para todos los actores.
- [ ] Revertir los cambios anteriores y confirmar que Rubi vuelve a funcionar con normalidad.

---

Si cualquier punto falla: no continuar activando más superficie (provider real, más asociaciones). Usar el kill switch correspondiente (`PILOT.md`) y registrar el hallazgo antes de decidir cómo seguir.
