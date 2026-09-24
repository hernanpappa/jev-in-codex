# Especificación: Instalación y guía de Codex

## Purpose

Documentar cómo instalar y conectar la integración heredada de Jev en un proyecto Codex, y cómo la guía complementaria decide cuándo usar las tres herramientas sin convertirlas en un paso obligatorio para cada tarea.

## Requirements

### Requirement: La instalación declara sus dependencias y métodos soportados

La guía SHALL declarar como requisitos Node.js 22 o posterior, npm y ripgrep disponible como `rg`, y SHALL indicar la instalación desde el código fuente con scripts de dependencias deshabilitados y verificación local. SHALL describir el plugin Codex incluido como empaquetado heredado, diferenciarlo de un marketplace y presentar la configuración MCP directa como el transporte verificado. SHALL identificar la instalación por UI de plugin como no verificada de extremo a extremo.

#### Scenario: El usuario prepara una instalación local
- **WHEN** el usuario sigue la guía de instalación desde el código fuente
- **THEN** SHALL poder identificar los prerequisitos, los comandos de preparación y el comando de verificación antes de conectar Codex

#### Scenario: El usuario instala el plugin de Codex
- **WHEN** el usuario selecciona la ruta de plugin heredado
- **THEN** la guía SHALL advertir que el repositorio no es un marketplace y que esa ruta por sí sola no instala Node, dependencias ni ripgrep

### Requirement: La habilidad complementaria usa Jev sólo cuando filtrar aporta valor

La habilidad SHALL reservar `jev_select_capability` para catálogos reales con opciones plausibles, `jev_search` para búsquedas de contexto ambiguas y `jev_triage` para salidas guardadas sustanciales. SHALL preferir búsqueda exacta normal para identificadores o literales, no SHALL asumir acceso a un catálogo global y SHALL continuar con herramientas normales si Jev no está disponible o el filtro no ayuda. SHALL indicar cómo interpretar método, cobertura, omisiones y puntuaciones.

#### Scenario: Una tarea requiere un lookup exacto simple
- **WHEN** el usuario busca un identificador o literal conocido
- **THEN** la guía SHALL dirigir a Codex a `rg` o lectura normal en lugar de requerir una llamada Jev

#### Scenario: Jev no está disponible o usa fallback
- **WHEN** las herramientas MCP no están disponibles o la respuesta informa `local_fallback`
- **THEN** la guía SHALL permitir continuar con herramientas normales y SHALL describir el resultado como ranking léxico si corresponde

#### Scenario: La cobertura deja evidencia sin examinar
- **WHEN** una búsqueda o triage informa archivos o fragmentos omitidos/no evaluados
- **THEN** SHALL indicar que la ausencia de resultados no prueba ausencia de evidencia y SHALL guiar a ampliar la búsqueda o leer el artefacto original
