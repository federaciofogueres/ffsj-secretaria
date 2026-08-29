# Changelog

## 0.1.2#ESMERALDA - 2026-08-30

### Añadido

- Bloque único de contexto que agrupa asociación, tipo, ejercicio y acceso a tareas pendientes.
- Resumen de tareas en la cabecera, con enlaces directos a cada gestión pendiente.

### Mejorado

- El cambio de ejercicio se realiza desde un selector desplegable con buscador y hasta diez resultados visibles.
- La confirmación de inicio de ejercicio utiliza el dialog propio de Secretaría Virtual y evita confirmaciones nativas del navegador.
- Los desplegables de contexto se cierran al navegar, al pulsar fuera o al usar Escape.

### Técnico

- El resumen de dashboard se comparte entre Inicio y cabecera para evitar llamadas duplicadas.
- Se reutiliza un estilo común para los dialogs propios de la aplicación.

## 0.1.1#ESMERALDA - 2026-08-29

### Mejorado

- El listado de asociados obtiene los cargos del ejercicio seleccionado en una única llamada y deja el histórico completo para el detalle individual.
- La interfaz identifica los ejercicios sin iniciar para la asociación conectada y permite inicializarlos desde la aplicación.

### Técnico

- El cliente refresca el ejercicio seleccionado tras su inicialización y actualiza sus pruebas de integración de componentes.
