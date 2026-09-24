# Spec Delta

## Purpose

Definir cómo Codex puede recuperar evidencia de un artefacto de texto guardado y acotar un diagnóstico sin reemplazar el archivo original ni convertir una coincidencia en una conclusión de causa raíz.

## ADDED Requirements

### Requirement: El triage lee un artefacto de texto y preserva su ubicación

La herramienta SHALL aceptar una ruta relativa y un rango de líneas opcional de un archivo regular UTF-8 de hasta 1 MiB, sin bytes nulos. SHALL dividir el rango en extractos de líneas completas de hasta 30 líneas y 4.000 bytes, y SHALL devolver la ruta y líneas originales de cada resultado. El rango SHALL ser de base 1; un `end_line` posterior al archivo SHALL recortarse al final, mientras un `end_line` anterior al inicio o un `start_line` posterior al archivo no vacío SHALL producir un error.

#### Scenario: Se consulta un rango válido de un artefacto
- **WHEN** Codex indica una ruta permitida y un rango válido
- **THEN** SHALL devolver extractos de ese rango con texto original y números de línea verificables

#### Scenario: El artefacto no es texto permitido
- **WHEN** la ruta apunta fuera del workspace, a un archivo excluido, a un archivo mayor de 1 MiB, binario o UTF-8 inválido
- **THEN** SHALL rechazar la lectura y SHALL realizar cero solicitudes a TypeSafe para esa operación

#### Scenario: Una línea excede el tamaño permitido
- **WHEN** un extracto del rango contiene una línea de más de 4.000 bytes
- **THEN** SHALL rechazar ese triage en vez de truncar silenciosamente la evidencia

### Requirement: La agrupación de duplicados preserva la cobertura

El triage SHALL agrupar únicamente extractos cuyo texto completo sea idéntico. Si hay más de 24 grupos únicos, SHALL preseleccionar hasta 24 con coincidencia léxica; SHALL informar en `coverage` el total de líneas, rango, fragmentos del rango, grupos únicos, fragmentos evaluados y no evaluados, y si se usó preselección. Cada grupo devuelto SHALL incluir hasta 20 ubicaciones, el conteo total de ocurrencias y el conteo de ubicaciones omitidas.

#### Scenario: Se repite exactamente el mismo extracto
- **WHEN** varios fragmentos tienen texto idéntico
- **THEN** SHALL devolver un grupo con sus ubicaciones y conteos, sin afirmar que comparten causa raíz

#### Scenario: El artefacto tiene más de 24 grupos únicos
- **WHEN** el archivo genera más de 24 fragmentos únicos dentro del rango
- **THEN** SHALL evaluar como máximo 24, SHALL ordenar la preselección por coincidencia léxica y SHALL reportar cuántos quedaron sin evaluar

#### Scenario: El grupo tiene más ubicaciones que el límite visible
- **WHEN** un fragmento idéntico aparece en más de 20 ubicaciones
- **THEN** SHALL devolver 20 ubicaciones y SHALL informar las restantes mediante los conteos de ocurrencias
