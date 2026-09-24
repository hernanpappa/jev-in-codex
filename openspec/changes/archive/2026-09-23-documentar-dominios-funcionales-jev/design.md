# Design

## Context

La revisión se hizo sobre `jev-coding-codex-tools`, que contiene el servidor MCP local con tres herramientas. El flujo visible es: `src/index.ts` configura el workspace y el evaluador; `src/server.ts` publica y valida las herramientas; `src/service.ts` implementa selección, búsqueda y triage; `src/workspace.ts` lee archivos y conserva ubicaciones; `src/jev.ts` aplica ranking remoto opcional o fallback léxico.

El contrato también depende de `skills/jev-assist/SKILL.md` y `docs/AGENTS.jev.md` (cuándo usar las herramientas y cómo tratar sus resultados), así como de `README.md`, `docs/INSTALL.md` y `docs/TESTING.md` (instalación, privacidad y límites). Las pruebas unitarias y MCP están en `test/`; `test/e2e.test.ts` simula TypeSafe mediante un servidor local y una precarga sólo de prueba. No se ejecutó aquí la suite ni una llamada real a TypeSafe.

No había catálogo OpenSpec previo. El checkout ya tenía cambios del usuario en `.mcp.json` y `.devin/`; quedan fuera de este cambio.

## Goals / Non-Goals

**Goals:**

- Crear contratos de comportamiento rastreables para las capacidades existentes, con escenarios que puedan compararse con pruebas y código.
- Describir límites verificables y distinguir los resultados Jev de los rankings del fallback local.
- Dar a futuros cambios un mapa de dominios estable sin mezclar herramientas, instalación y límites de privacidad en una sola spec.

**Non-Goals:**

- Añadir, retirar o modificar herramientas MCP ni la forma de instalar Jev.
- Cambiar código fuente, pruebas, dependencias, configuración MCP o instrucciones persistentes del proyecto.
- Afirmar calidad del ranking, ahorro de contexto, ausencia de vulnerabilidades o compatibilidad completa con la UI de plugins de Codex.

## Decisions

1. **Registrar el comportamiento actual como línea base.** Las siete capacidades de `proposal.md` son funciones ya implementadas en esta rama; las specs nuevas las documentan para desarrollo posterior y no significan que se vaya a implementar un segundo sistema. Alternativa descartada: marcar el cambio como documentación sin specs, lo cual no cumpliría la solicitud de establecer la documentación funcional OpenSpec.
2. **Separar por responsabilidad observable.** MCP, selección, búsqueda, triage, evaluación/fallback, protección de datos e instalación tienen entradas, límites o usuarios distintos. Mantenerlas planas evita crear niveles de carpeta artificiales y permite que cambios futuros afecten sólo los contratos pertinentes. Alternativa descartada: una spec monolítica que mezcle instalación y comportamiento del servidor.
3. **Mantener seguridad y proveedor como contratos relacionados pero distintos.** `jev-y-fallback-local` cubre destino, protocolo, validación, timeout y modo de puntuación; `proteccion-workspace-y-datos` cubre qué se puede leer y qué advertencias recibe quien configura la integración. Esto separa la implementación de egress de la decisión del usuario sobre datos.
4. **Usar las pruebas como evidencia de contrato, no como afirmación de ejecución en este turno.** Las pruebas cubren el handshake stdio, esquemas, límites de workspace, ranking, fallback, líneas originales y proveedor simulado. `docs/TESTING.md` aclara que eso no valida autenticación, TLS, ranking vivo ni instalación en UI. Alternativa descartada: presentar fixtures sintéticos como benchmark o verificación del servicio real.
5. **Conservar explícitamente el estado experimental.** El README declara que no hay benchmarks de calidad, ahorro o latencia. Las specs describen umbrales y ranking observados como heurísticas, no como garantías estadísticas.

## Risks / Trade-offs

- **Las specs podrían perpetuar un límite accidental del MVP** → Etiquetar el catálogo como línea base de la rama actual; futuras mejoras deben modificar el requisito y añadir pruebas, en vez de tratar cada heurística como diseño óptimo.
- **Cambios de código podrían dejar la documentación obsoleta** → Revisar las specs relevantes junto con cada cambio funcional y ejecutar `openspec validate --strict` antes de archivar.
- **El ranking remoto implica egreso de contenido y consumo de cuenta TypeSafe** → La spec y las guías dejan claro qué texto se transmite; no se presenta la lista de nombres excluidos como detección de secretos.
- **El límite de exploración de 20 MiB es aproximado** → El recorrido lee archivos de hasta 1 MiB y puede cruzar el umbral con el último archivo; la spec lo dice expresamente y conserva cobertura de lo no examinado.
- **Una respuesta remota JSON no tiene límite de bytes antes de parsearse y no hay una cuota global de concurrencia/gasto** → Tratarlo como riesgo de robustez por evaluar en un cambio futuro; no afirmar que los límites por solicitud constituyen un límite global.
- **La revisión de seguridad almacenada corresponde a una revisión estática anterior y excluye ejecución, dependencias y consultas vivas** → No usarla como certificación de la revisión actual; estas specs reflejan límites de código y documentación, no una garantía de ausencia de vulnerabilidades.
- **La instalación del plugin por UI no está verificada de extremo a extremo** → La documentación conserva MCP directo como ruta probada y describe la incertidumbre de la UI sin presentarla como compatibilidad confirmada.

## Migration Plan

No hay migración de runtime: este cambio sólo agrega artefactos OpenSpec. Una vez revisados los contratos, se pueden incorporar al catálogo vigente con el flujo normal de archivo de OpenSpec. Los cambios funcionales posteriores deben proponer deltas sobre las capacidades afectadas; revertir esta documentación no requiere revertir código ni configuración de usuario.
