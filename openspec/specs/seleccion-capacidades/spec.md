# Especificación: Selección de capacidades

## Purpose

Definir cómo Codex puede pedir una comparación acotada entre herramientas o habilidades que ya conoce, conservando su control sobre el catálogo y la decisión final.

## Requirements

### Requirement: La selección evalúa solamente el catálogo proporcionado

La herramienta SHALL recibir un objetivo y entre 1 y 24 candidatos explícitos, cada uno con un identificador único de 1 a 200 caracteres, tipo `tool` o `skill` y descripción de 1 a 2.000 caracteres. SHALL rechazar identificadores duplicados y no SHALL descubrir por sí misma el catálogo de Codex.

#### Scenario: El llamante proporciona capacidades reales
- **WHEN** la solicitud contiene candidatos válidos con identificadores únicos
- **THEN** SHALL evaluar esos candidatos para el objetivo indicado y SHALL devolver el número evaluado

#### Scenario: El catálogo contiene identificadores duplicados
- **WHEN** dos o más candidatos comparten el mismo identificador
- **THEN** SHALL rechazar la solicitud con un error de entrada

### Requirement: La recomendación permite abstenerse

La herramienta SHALL devolver los candidatos elegibles ordenados por puntuación descendente, limitar la lista de salida al `limit` solicitado y exponer `recommendation` como el identificador mejor puntuado elegible o `null`. Con evaluación Jev, SHALL exigir puntuación mínima de 0,5; con fallback léxico, SHALL requerir puntuación mayor que cero. La recomendación SHALL ser consultiva y no una autorización de ejecución.

#### Scenario: No hay candidato por encima del umbral
- **WHEN** ninguna capacidad alcanza el umbral aplicable al método informado
- **THEN** SHALL devolver `recommendation: null` y una lista `results` vacía

#### Scenario: Hay capacidades elegibles
- **WHEN** una o más capacidades alcanzan el umbral aplicable
- **THEN** SHALL informar la mejor como recomendación y SHALL devolver resultados elegibles en orden descendente hasta el límite solicitado
