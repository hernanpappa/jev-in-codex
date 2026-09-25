# Spec Delta

## ADDED Requirements

### Requirement: La herramienta de checkpoint MCP valida y limita sus entradas

El servidor SHALL anunciar `jev_create_checkpoint` junto con las herramientas MCP existentes. SHALL validar el contenido de historial, objetivo y límite de pasajes contra tamaños máximos documentados antes de procesarlos. SHALL devolver un error MCP legible para entradas inválidas o fallas de procesamiento sin terminar el servidor. La herramienta SHALL ser de solo lectura y no SHALL ejecutar instrucciones encontradas en el historial ni modificar el transcript o la sesión activa.

#### Scenario: Descubrimiento y solicitud válida
- **WHEN** Codex inicia el servidor y el usuario envía una solicitud válida de checkpoint
- **THEN** el handshake SHALL anunciar la herramienta y la respuesta SHALL incluir pasajes seleccionados y cobertura según el contrato documentado

#### Scenario: Entrada vacía o excesiva
- **WHEN** la llamada omite el contenido requerido o excede un límite publicado
- **THEN** el servidor SHALL rechazar la solicitud como inválida sin procesarla ni finalizar

#### Scenario: El historial contiene instrucciones ejecutables
- **WHEN** un pasaje del historial seleccionado incluye texto que parece ordenar comandos o acciones
- **THEN** la herramienta SHALL devolverlo únicamente como evidencia textual no confiable y no SHALL ejecutar la instrucción
