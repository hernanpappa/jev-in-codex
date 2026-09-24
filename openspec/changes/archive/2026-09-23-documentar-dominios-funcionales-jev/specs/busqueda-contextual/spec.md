# Spec Delta

## Purpose

Definir la recuperación acotada de código y documentación dentro del workspace configurado, incluyendo el alcance léxico, el ranking de extractos y la cobertura que Codex necesita para juzgar si debe ampliar la búsqueda.

## ADDED Requirements

### Requirement: La búsqueda usa un alcance relativo y una preselección léxica acotada

La herramienta SHALL aceptar entre 1 y 10 rutas relativas de alcance (de 1 a 1.024 caracteres cada una), hasta 12 términos de consulta (de 1 a 100 caracteres cada uno) y un límite de resultados entre 1 y 10. SHALL descubrir archivos con reglas de ignore del repositorio, excluir rutas no permitidas, dividir texto en extractos de líneas completas de hasta 30 líneas y 4.000 bytes, y preseleccionar como máximo 24 extractos con coincidencia léxica antes de cualquier ranking remoto. La búsqueda SHALL ser descrita como recuperación léxica, no como índice semántico exhaustivo.

#### Scenario: Búsqueda dentro de un directorio válido
- **WHEN** la solicitud incluye un alcance relativo dentro del workspace
- **THEN** SHALL recuperar candidatos únicamente de ese alcance y devolver las rutas y líneas originales

#### Scenario: La búsqueda no encuentra coincidencias léxicas
- **WHEN** ningún extracto coincide con los términos consultados
- **THEN** SHALL devolver una lista vacía y cobertura, sin afirmar que el workspace carece de evidencia relevante

#### Scenario: Se exceden los límites de parámetros
- **WHEN** se proporcionan más de 10 alcances, más de 12 términos o un límite de salida inválido
- **THEN** SHALL rechazar la solicitud antes de buscar

### Requirement: La búsqueda comunica la cobertura incompleta

La respuesta SHALL incluir los archivos descubiertos, examinados, omitidos y no examinados, bytes examinados, extractos coincidentes y preseleccionados, además de indicar que el método inicial de recuperación fue léxico y que se respetaron reglas de ignore. La exploración SHALL estar limitada a 500 archivos elegibles y aproximadamente 20 MiB por llamada; el archivo que cruza el umbral de bytes puede hacer que el valor final lo exceda.

#### Scenario: El alcance rebasa los límites de exploración
- **WHEN** hay más archivos o bytes elegibles que los permitidos para una llamada
- **THEN** SHALL detener la exploración al alcanzar el límite y SHALL informar los archivos que quedaron sin examinar en `coverage`

#### Scenario: Un archivo no se puede procesar
- **WHEN** un archivo elegible no puede leerse o no cumple los requisitos de texto
- **THEN** SHALL contarlo como omitido y SHALL continuar con los demás archivos dentro de los límites disponibles
