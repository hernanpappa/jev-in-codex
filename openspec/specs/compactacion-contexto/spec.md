# Especificación: Compactación de contexto

## Purpose

Permite conservar evidencia conversacional importante antes de una compactación nativa de Codex y recuperarla en la continuación, además de crear checkpoints bajo demanda sin alterar el historial activo.

## Requirements

### Requirement: El usuario puede crear un checkpoint extractivo bajo demanda
El sistema SHALL ofrecer `jev_create_checkpoint` para que el usuario solicite un checkpoint a partir de contenido de conversación que proporcione explícitamente. SHALL devolver una selección acotada de pasajes textuales originales, identificados por su posición o referencia de origen cuando esté disponible, junto con sus puntuaciones y límites de cobertura. SHALL preservar el texto fuente sin presentarlo como resumen generado por Jev, y no SHALL modificar ni compactar el historial activo.

#### Scenario: Creación manual con historial provisto
- **WHEN** el usuario invoca la herramienta con contenido y un objetivo de preservación válidos
- **THEN** Jev SHALL devolver pasajes originales relevantes dentro del límite solicitado y dejar intacto el historial activo

#### Scenario: No hay evidencia relevante suficiente
- **WHEN** el contenido provisto no contiene pasajes que satisfagan el objetivo por encima del umbral disponible
- **THEN** la respuesta SHALL indicarlo y SHALL evitar inventar texto para completar el checkpoint

### Requirement: La compactación nativa de Codex puede generar y restaurar checkpoints
La integración SHALL poder generar un checkpoint local antes de compactaciones manuales y automáticas de Codex y aportar ese checkpoint a la continuación iniciada después de una compactación nativa. SHALL usar sólo eventos de ciclo de vida de Codex para detectar esos momentos y no SHALL reemplazar, iniciar, cancelar ni controlar la compactación nativa. Un error al crear o cargar el checkpoint SHALL permitir que Codex continúe su compactación o sesión sin Jev.

#### Scenario: Compactación manual
- **WHEN** Codex emite el evento previo a una compactación manual con una referencia de transcript utilizable
- **THEN** la integración SHALL intentar preparar un checkpoint local antes de que Codex compacte

#### Scenario: Compactación automática
- **WHEN** Codex emite el evento previo a una compactación automática con una referencia de transcript utilizable
- **THEN** la integración SHALL intentar preparar el checkpoint bajo las mismas garantías de seguridad y sin imponer un umbral propio

#### Scenario: Reanudación posterior a compactar
- **WHEN** Codex inicia una continuación cuya fuente indica que ocurrió una compactación y existe un checkpoint vigente para esa sesión
- **THEN** la integración SHALL aportar el checkpoint como contexto adicional sin sustituir el historial que Codex conservó

#### Scenario: Hook falla o transcript no está disponible
- **WHEN** el evento, la lectura del transcript o Jev falla
- **THEN** el hook SHALL terminar sin bloquear ni cancelar la compactación nativa y SHALL dejar que Codex continúe con su comportamiento normal

### Requirement: La cadencia de compactación sigue bajo control de Codex
La integración SHALL aceptar que Codex decide cuándo compactar y no SHALL prometer compactación al alcanzarse un porcentaje de contexto o una cantidad de mensajes. SHALL permitir usar el checkpoint manual independientemente de la compactación nativa. Un contador de mensajes, si se incorpora para observar o sugerir una cadencia, no SHALL presentarse como acceso al porcentaje real de contexto ni como control de compactación.

#### Scenario: Se alcanza un número de mensajes configurado
- **WHEN** la conversación alcanza un conteo configurado sin que Codex haya emitido un evento de compactación
- **THEN** el sistema SHALL poder ofrecer una indicación o permitir una invocación manual, pero SHALL no afirmar que la compactación nativa ya se ejecutó o que ocurrirá en ese momento

#### Scenario: El usuario invoca el checkpoint entre compactaciones
- **WHEN** el usuario llama explícitamente a `jev_create_checkpoint` antes de que Codex compacte
- **THEN** la herramienta SHALL devolver el checkpoint solicitado sin forzar una compactación
