# Spec Delta

## ADDED Requirements

### Requirement: La instalación configura y explica los hooks de checkpoint

La guía SHALL documentar cómo instalar, inspeccionar, deshabilitar y verificar la herramienta manual y los hooks de Codex para preparar y restaurar checkpoints. SHALL aclarar que el umbral y la ejecución de compactación pertenecen a Codex, que un contador de mensajes no equivale a porcentaje de contexto y que el checkpoint manual no compacta la conversación. SHALL explicar la continuidad sin Jev si hooks, transcript o proveedor no están disponibles.

#### Scenario: Instalación de hooks en el proyecto
- **WHEN** el usuario sigue la guía para habilitar la integración de checkpoints
- **THEN** podrá identificar los eventos configurados, el almacenamiento local, los permisos de transcript solicitados y cómo validar cada hook sin enviar una conversación de prueba a un proveedor remoto

#### Scenario: Usuario revisa o desactiva la integración
- **WHEN** el usuario necesita auditar o deshabilitar los checkpoints automáticos
- **THEN** la guía SHALL indicar dónde inspeccionar la configuración y cómo desactivarla conservando la compactación nativa de Codex
