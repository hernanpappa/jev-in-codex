# Especificación: Jev y fallback local

## Purpose

Definir la frontera entre la evaluación opcional de relevancia en TypeSafe y el ranking léxico local, así como la validación y metadatos necesarios para distinguir ambos métodos.

## Requirements

### Requirement: La evaluación remota usa un destino y un contrato fijos

Cuando `TYPESAFE_API_KEY` está configurada y hay candidatos, el servidor SHALL enviar objetivo y candidatos en solicitudes POST al endpoint HTTPS fijo `https://api.typesafe.ai/v1/systemone`, autenticadas con bearer token, sin seguir redirecciones y con timeout de ocho segundos por solicitud. SHALL evaluar lotes secuenciales de hasta cuatro candidatos, no SHALL reintentar automáticamente y SHALL respetar un máximo de 28.000 bytes por cuerpo de solicitud. `JEV_MODEL` SHALL elegir el modelo si está configurado; en su ausencia SHALL usar `jev-latest`.

#### Scenario: El proveedor responde con puntuaciones válidas
- **WHEN** TypeSafe devuelve respuestas `noul` válidas para todos los candidatos de todos los lotes
- **THEN** SHALL ordenar por esas puntuaciones e informar `method: jev`, `score_kind: noul`, el modelo efectivo cuando esté disponible y el número de solicitudes

#### Scenario: La solicitud excede el límite de bytes
- **WHEN** el cuerpo preparado supera 28.000 bytes
- **THEN** SHALL abandonar el ranking remoto y producir el resultado local explícito sin enviar ese cuerpo

### Requirement: El fallback local reemplaza íntegramente un ranking remoto fallido

Si falta la clave, ocurre un error HTTP o de red, timeout, JSON inválido, respuesta fuera del esquema o falta una respuesta esperada, el servidor SHALL puntuar todos los candidatos localmente por solapamiento léxico. SHALL descartar puntuaciones Jev parciales, no mezclar escalas y SHALL informar `method: local_fallback`, `score_kind: lexical_overlap`, una razón de fallback segura y el número de solicitudes intentadas. Las puntuaciones SHALL presentarse como orientación, no como probabilidades ni garantías calibradas.

#### Scenario: No hay clave de TypeSafe
- **WHEN** se clasifica una lista de candidatos sin `TYPESAFE_API_KEY`
- **THEN** SHALL devolver ranking léxico sin realizar solicitudes de red y SHALL indicar cero solicitudes y fallback local

#### Scenario: Falla un lote posterior al primero
- **WHEN** un lote remoto posterior falla después de haber producido puntuaciones válidas para lotes anteriores
- **THEN** SHALL descartar todas las puntuaciones remotas de esa operación y SHALL recalcular localmente la lista completa

#### Scenario: El proveedor devuelve datos inválidos o detalles sensibles
- **WHEN** el proveedor devuelve contenido inválido o un error que contiene datos privados
- **THEN** SHALL usar el fallback local y SHALL omitir cuerpos de respuesta, credenciales y detalles remotos sensibles del resultado
