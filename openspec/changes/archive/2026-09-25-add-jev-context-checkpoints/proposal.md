# Proposal

## Why

Las sesiones largas de Codex pueden perder decisiones y estado de trabajo al compactarse, pero Jev hoy no participa del ciclo de vida del historial. Hace falta conservar evidencia relevante antes de la compactación y volver a ofrecerla a Codex después, sin reemplazar ni intentar controlar la compactación nativa.

## What Changes

- Agregar `jev_create_checkpoint`, una herramienta invocable cuando el usuario quiera, que seleccione un conjunto acotado de pasajes originales de un historial provisto y los devuelva como checkpoint; no modificará el historial activo.
- Integrar hooks de Codex para preparar el checkpoint ante compactaciones manuales o automáticas y aportar ese checkpoint a la continuación posterior a una compactación nativa.
- Mantener el umbral y la operación de compactación bajo control de Codex. La integración no prometerá compactar al llegar a un número configurable de mensajes ni a un porcentaje exacto de contexto.
- Tratar el transcript como dato sensible: acotar su lectura, mantener el checkpoint local y exigir una opción explícita adicional antes de enviar extractos de conversación a TypeSafe.

## Capabilities

### New Capabilities

- `compactacion-contexto`: checkpoints extractivos, invocación manual e integración con los hooks de compactación nativa de Codex.

### Modified Capabilities

- `servidor-mcp-codex`: exponer y validar la nueva herramienta de checkpoints.
- `instalacion-y-guia-codex`: instalar, revisar y explicar los hooks además de la conexión MCP.
- `proteccion-workspace-y-datos`: definir el acceso al transcript, la divulgación remota opcional y la retención local mínima del checkpoint.

## Impact

Afecta `src/server.ts`, `src/service.ts` y la integración Jev en `src/jev.ts`; agrega el manejador local de hooks de Codex y su configuración en el plugin; actualiza pruebas, documentación y las capacidades OpenSpec indicadas. No requiere que Jev genere texto libre ni añade un proveedor de resumen: se conservan pasajes fuente y Codex sigue siendo responsable de su compactación nativa.
