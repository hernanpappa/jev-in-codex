# Spec Delta

## MODIFIED Requirements

### Requirement: La evaluación remota usa un destino y un contrato fijos

El servidor SHALL seleccionar exactamente una ruta mediante `JEV_PROVIDER`: `openrouter` si falta la variable o vale `openrouter`, `typesafe` si vale `typesafe`, y `vercel` si vale `vercel`. Un valor distinto SHALL impedir el inicio del MCP sin divulgar secretos y SHALL no producir solicitudes remotas. La ruta OpenRouter SHALL usar únicamente `OPENROUTER_API_KEY`, `POST https://openrouter.ai/api/alpha/decisions` y el modelo Jev de decisiones `~typesafe/jev-latest`. La ruta TypeSafe directa SHALL conservar `TYPESAFE_API_KEY`, `https://api.typesafe.ai/v1/systemone` y `JEV_MODEL` o `jev-latest`; la ruta Vercel SHALL conservar `AI_GATEWAY_API_KEY`, `https://ai-gateway.vercel.sh/typesafe/v1/systemone` y `typesafe-ai/jev`. `JEV_MODEL` SHALL aplicarse sólo a TypeSafe directo. Las tres rutas SHALL enviar objetivo y candidatos en `state` y preguntas `noul` en `questions`, aceptar sólo respuestas `noul` válidas y conservar lotes secuenciales de hasta cuatro candidatos, límite de 28.000 bytes por solicitud, bearer token, HTTPS, redirecciones rechazadas, timeout de ocho segundos por solicitud y ausencia de reintentos automáticos. El resultado SHALL informar `provider_route`, `method`, `score_kind`, modelo efectivo cuando esté disponible y número de solicitudes sin divulgar credenciales.

#### Scenario: OpenRouter es el valor predeterminado
- **WHEN** `JEV_PROVIDER` no está definido y hay una `OPENROUTER_API_KEY` válida
- **THEN** SHALL enviar sólo a la Decisions API de OpenRouter con un modelo Jev de decisiones y SHALL informar `provider_route: openrouter` y `method: jev` si recibe todas las respuestas válidas

#### Scenario: El proveedor responde con puntuaciones válidas
- **WHEN** la ruta seleccionada devuelve respuestas `noul` válidas para todos los candidatos de todos los lotes
- **THEN** SHALL ordenar por esas puntuaciones e informar `method: jev`, `score_kind: noul`, el modelo efectivo cuando esté disponible y el número de solicitudes

#### Scenario: Selección explícita de rutas anteriores
- **WHEN** `JEV_PROVIDER=typesafe` o `JEV_PROVIDER=vercel`
- **THEN** SHALL conservar el endpoint, clave, modelo y contrato de la ruta explícitamente seleccionada sin contactar OpenRouter

#### Scenario: Hay tres claves disponibles
- **WHEN** están presentes las tres credenciales y `JEV_PROVIDER=openrouter`
- **THEN** SHALL usar sólo `OPENROUTER_API_KEY` para solicitudes a OpenRouter y SHALL no enviar contenido a Vercel ni a TypeSafe directo

#### Scenario: Ambas claves están disponibles
- **WHEN** `TYPESAFE_API_KEY` y `AI_GATEWAY_API_KEY` están configuradas y `JEV_PROVIDER=vercel`
- **THEN** SHALL enviar los lotes sólo a AI Gateway con la clave de Vercel y el modelo `typesafe-ai/jev`

#### Scenario: Se omite el selector en una instalación anterior
- **WHEN** existe `TYPESAFE_API_KEY` y `JEV_PROVIDER` no está configurado
- **THEN** SHALL seleccionar OpenRouter y, sin `OPENROUTER_API_KEY`, SHALL usar fallback local; para conservar TypeSafe directo se requiere `JEV_PROVIDER=typesafe`

#### Scenario: La solicitud excede el límite de bytes
- **WHEN** el cuerpo preparado supera 28.000 bytes
- **THEN** SHALL abandonar el ranking remoto y producir fallback local sin enviar ese cuerpo

#### Scenario: Selector inválido
- **WHEN** `JEV_PROVIDER` tiene un valor distinto de las tres rutas admitidas
- **THEN** el MCP SHALL rechazar la configuración antes de atender herramientas y SHALL no usar ninguna credencial

#### Scenario: Selector de proveedor inválido
- **WHEN** `JEV_PROVIDER` contiene un valor distinto de `openrouter`, `typesafe` o `vercel`
- **THEN** el MCP SHALL rechazar esa configuración antes de atender herramientas y SHALL no usar ninguna de las tres claves

### Requirement: El fallback local reemplaza íntegramente un ranking remoto fallido

Si falta la clave de la ruta elegida, ocurre un error HTTP o de red, timeout, JSON inválido, respuesta fuera del esquema o falta una respuesta esperada, el servidor SHALL puntuar todos los candidatos localmente por solapamiento léxico. SHALL descartar puntuaciones Jev parciales, no mezclar escalas y SHALL informar `method: local_fallback`, `score_kind: lexical_overlap`, `provider_route`, una razón segura y el número de solicitudes intentadas. No SHALL probar otra ruta remota aunque su clave exista. Las puntuaciones SHALL presentarse como orientación, no como probabilidades ni garantías calibradas.

#### Scenario: OpenRouter predeterminado sin clave
- **WHEN** falta `JEV_PROVIDER` y falta `OPENROUTER_API_KEY`, aunque exista `TYPESAFE_API_KEY` o `AI_GATEWAY_API_KEY`
- **THEN** SHALL usar ranking local con cero solicitudes e identificar la credencial OpenRouter faltante sin contactar a otro proveedor

#### Scenario: No hay clave de TypeSafe
- **WHEN** se clasifica una lista de candidatos con `JEV_PROVIDER=typesafe` y sin `TYPESAFE_API_KEY`
- **THEN** SHALL devolver ranking léxico sin realizar solicitudes de red y SHALL indicar cero solicitudes y fallback local

#### Scenario: Falla un lote posterior al primero
- **WHEN** un lote remoto posterior falla después de que otro produjo puntuaciones válidas
- **THEN** SHALL descartar todas las puntuaciones remotas de esa operación y recalcular localmente la lista completa

#### Scenario: OpenRouter rechaza la clave o el modelo
- **WHEN** OpenRouter devuelve HTTP 401, 403 u otro error
- **THEN** SHALL informar fallback local con el código HTTP, sin incluir cuerpo remoto, credencial ni contenido enviado y sin conmutar a Vercel o TypeSafe directo

#### Scenario: El proveedor devuelve datos inválidos o detalles sensibles
- **WHEN** el proveedor devuelve JSON inválido, respuestas `noul` incompletas o detalles sensibles en un error
- **THEN** SHALL usar fallback local y omitir cuerpos de respuesta y detalles sensibles del resultado

#### Scenario: Ruta anterior elegida sin su propia clave
- **WHEN** `JEV_PROVIDER=typesafe` o `JEV_PROVIDER=vercel` y falta la clave de esa ruta
- **THEN** SHALL usar ranking local sin probar OpenRouter ni la tercera ruta

#### Scenario: Falta la clave de Vercel y existe la de TypeSafe
- **WHEN** `JEV_PROVIDER=vercel`, falta `AI_GATEWAY_API_KEY` y existe `TYPESAFE_API_KEY`
- **THEN** SHALL usar sólo ranking local, informar que falta la credencial de la ruta elegida y SHALL no contactar a TypeSafe

#### Scenario: Vercel falla y TypeSafe está disponible
- **WHEN** una solicitud a AI Gateway falla y también existe una clave directa de TypeSafe
- **THEN** SHALL usar el fallback local para todos los candidatos y SHALL no enviar una solicitud adicional al endpoint directo
