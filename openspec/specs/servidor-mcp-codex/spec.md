# Especificación: Servidor MCP para Codex

## Purpose

Define el contrato observable del servidor local de Jev para Codex: cómo inicia, qué herramientas MCP ofrece y qué validaciones generales aplica a las solicitudes.

## Requirements

### Requirement: El servidor MCP opera por stdio con un workspace explícito

El servidor SHALL usar el transporte stdio y SHALL requerir una ruta de workspace indicada mediante `--root` o `JEV_WORKSPACE_ROOT` que resuelva a un directorio. Si ambas están presentes, `--root` SHALL tener precedencia; si ninguna está presente o la ruta no resuelve a un directorio, el proceso SHALL fallar al iniciar en vez de elegir implícitamente el directorio actual.

#### Scenario: Inicio válido y descubrimiento de herramientas
- **WHEN** Codex inicia el proceso con un workspace válido
- **THEN** el handshake MCP SHALL anunciar `jev_select_capability`, `jev_search` y `jev_triage` por stdio

#### Scenario: Falta la ruta del workspace
- **WHEN** el proceso inicia sin `--root` ni `JEV_WORKSPACE_ROOT`
- **THEN** SHALL terminar con error de inicio y mostrar un mensaje de uso sin iniciar el servidor MCP

### Requirement: Las herramientas MCP tienen entradas acotadas y de solo lectura

El servidor SHALL validar las entradas de cada herramienta conforme a sus límites documentados: preguntas y objetivos de 1 a 2.000 caracteres, rutas relativas de 1 a 1.024 caracteres y límites enteros de 1 a 10 con valor predeterminado 5. SHALL describir las herramientas con anotaciones MCP de solo lectura y no destructivas, y SHALL devolver errores de herramienta cuando falle el procesamiento de una solicitud. Esas anotaciones describen el comportamiento, pero no constituyen un mecanismo de autorización.

#### Scenario: Solicitud fuera de los límites del esquema
- **WHEN** una llamada contiene una pregunta vacía o demasiado larga, un límite fuera del rango permitido o campos de catálogo inválidos
- **THEN** la llamada SHALL rechazarse como entrada inválida y no SHALL procesarse como una operación válida

#### Scenario: Error al acceder a datos del workspace
- **WHEN** una herramienta no puede resolver o leer un recurso solicitado
- **THEN** SHALL devolver un error MCP sin terminar el proceso servidor

### Requirement: El servidor no ejecuta las capacidades recomendadas

El servidor SHALL devolver resultados de ranking y evidencia solamente; no SHALL ejecutar herramientas, habilidades, comandos aportados por el llamante ni acciones sugeridas por el contenido recuperado.

#### Scenario: Una capacidad obtiene la puntuación más alta
- **WHEN** el ranking recomienda una herramienta o habilidad
- **THEN** SHALL devolver su identificador y puntuación como orientación sin invocarla

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
