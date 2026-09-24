# Tasks

## 1. Revisar contratos funcionales

- [x] 1.1 Contrastar las specs de servidor MCP y selección con `src/server.ts`, `src/service.ts` y `test/mcp.test.ts`; verificar que nombres, límites, abstención y errores describan el comportamiento real.
- [x] 1.2 Contrastar búsqueda y triage con `src/workspace.ts`, `src/service.ts` y sus pruebas; verificar límites, cobertura, rangos, líneas y agrupación exacta.
- [x] 1.3 Revisar evaluación remota, fallback y protección de datos frente a `src/jev.ts`, `README.md` y las pruebas; verificar que egress, sanitización y límites estén descritos sin presentar las puntuaciones como garantías.
- [x] 1.4 Revisar instalación y guía contra `docs/INSTALL.md`, `docs/AGENTS.jev.md`, `skills/jev-assist/SKILL.md` y `docs/TESTING.md`; verificar que plugin heredado, prerequisitos y pruebas simuladas no se confundan con una instalación UI o evaluación en vivo.

## 2. Validar y publicar el catálogo base

- [x] 2.1 Ejecutar `openspec validate documentar-dominios-funcionales-jev --strict` y corregir cualquier error de estructura, escenarios o cobertura de requisitos.
- [x] 2.2 Revisar el diff y `git status` para confirmar que el cambio sólo añade OpenSpec y conserva los cambios preexistentes en `.mcp.json` y `.devin/`.
- [x] 2.3 Después de aprobar esta línea base, archivar el cambio con OpenSpec y verificar con `openspec list --specs` que aparecen las siete capacidades documentadas.
