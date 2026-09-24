# Proposal

## Why

La rama `jev-coding-codex-tools` contiene una integración MVP funcional, pero aún no tiene un catálogo OpenSpec que describa sus contratos ni sus límites. Documentar el comportamiento comprobable por dominios deja una base común para continuar el desarrollo sin confundir esta variante de tres herramientas con otras versiones de Jev.

## What Changes

- Crear un catálogo inicial de especificaciones en español que refleje el comportamiento existente de MCP, selección, búsqueda, triage, evaluación remota/fallback, límites del workspace e instalación/guía para Codex.
- Documentar en `design.md` la arquitectura y las decisiones de alcance, y en `tasks.md` cómo revisar la documentación generada.
- Registrar restricciones y riesgos observados, como el envío opcional de extractos a TypeSafe, los límites de cobertura y el estado experimental sin benchmarks.
- No cambiar código, herramientas expuestas, configuración del proyecto ni comportamiento de ejecución.

## Capabilities

### New Capabilities

Estas capacidades ya existen en la aplicación; las nuevas specs las establecen como contratos de línea base para el desarrollo futuro, no como funcionalidad nueva de runtime.

- `servidor-mcp-codex`: inicio local por stdio, descubrimiento de las tres herramientas y validación de sus entradas.
- `seleccion-capacidades`: ranking de un catálogo suministrado explícitamente y posibilidad de abstenerse.
- `busqueda-contextual`: recuperación léxica acotada de extractos del workspace, ranking y cobertura.
- `triage-salidas`: análisis de artefactos guardados, preservación de evidencia y agrupación de fragmentos idénticos.
- `jev-y-fallback-local`: evaluación TypeSafe opcional, validación de respuestas, fallback local y metadatos visibles del método.
- `proteccion-workspace-y-datos`: límites de lectura local, exclusiones, divulgación de contenido y tratamiento de evidencia no confiable.
- `instalacion-y-guia-codex`: requisitos y rutas de instalación, plugin heredado, MCP y uso de la habilidad complementaria.

### Modified Capabilities

Ninguna. El repositorio todavía no contiene specs funcionales que modificar.

## Impact

- Añade documentación OpenSpec bajo `openspec/changes/documentar-dominios-funcionales-jev/` y deja el catálogo preparado para su archivo posterior.
- Usa como fuentes de verdad el código de `src/`, las pruebas de `test/`, `README.md`, `docs/INSTALL.md`, `docs/TESTING.md`, `docs/AGENTS.jev.md` y `skills/jev-assist/SKILL.md`.
- No cambia API MCP, dependencias, instrucciones persistentes, configuración del usuario ni archivos de aplicación.
