# Spec Delta

## MODIFIED Requirements

### Requirement: La evaluación remota usa un destino y un contrato fijos

El servidor SHALL seleccionar una sola ruta remota mediante `JEV_PROVIDER`: `typesafe` cuando la variable falta o vale `typesafe`, y `vercel` cuando vale `vercel`. Una selección no reconocida SHALL impedir el inicio del MCP con un error de configuración sin secretos y SHALL no producir solicitudes remotas. La ruta directa SHALL usar `TYPESAFE_API_KEY`, `https://api.typesafe.ai/v1/systemone` y `JEV_MODEL` o, por defecto, `jev-latest`. La ruta Vercel SHALL usar `AI_GATEWAY_API_KEY`, `https://ai-gateway.vercel.sh/typesafe/v1/systemone` y el modelo fijo `typesafe-ai/jev`; `JEV_MODEL` SHALL aplicarse sólo a la ruta directa. Ambas rutas SHALL enviar objetivo y candidatos con el contrato `systemone` y SHALL aceptar únicamente respuestas `noul` válidas. SHALL conservar lotes secuenciales de hasta cuatro candidatos, el límite de 28.000 bytes por solicitud, bearer token, HTTPS, redirecciones rechazadas, timeout de ocho segundos por solicitud y ausencia de reintentos automáticos. Las respuestas SHALL conservar `method: jev` y `score_kind: noul` cuando el ranking remoto tenga éxito, e informar `provider_route` y el modelo efectivo sin divulgar credenciales.

#### Scenario: El proveedor responde con puntuaciones válidas
- **WHEN** la ruta elegida devuelve respuestas `noul` válidas para todos los candidatos de todos los lotes
- **THEN** SHALL ordenar por esas puntuaciones e informar `method: jev`, `score_kind: noul`, `provider_route`, el modelo efectivo cuando esté disponible y el número de solicitudes

#### Scenario: La solicitud excede el límite de bytes
- **WHEN** el cuerpo preparado supera 28.000 bytes
- **THEN** SHALL abandonar el ranking remoto y producir el resultado local explícito sin enviar ese cuerpo

#### Scenario: Ambas claves están disponibles
- **WHEN** `TYPESAFE_API_KEY` y `AI_GATEWAY_API_KEY` están configuradas y `JEV_PROVIDER=vercel`
- **THEN** SHALL enviar los lotes sólo a AI Gateway con la clave de Vercel y el modelo `typesafe-ai/jev`

#### Scenario: Se omite el selector en una instalación anterior
- **WHEN** existe `TYPESAFE_API_KEY` y `JEV_PROVIDER` no está configurado
- **THEN** SHALL conservar la ruta directa, su modelo predeterminado y el comportamiento de ranking existente

#### Scenario: Selector de proveedor inválido
- **WHEN** `JEV_PROVIDER` contiene un valor distinto de `typesafe` o `vercel`
- **THEN** el MCP SHALL rechazar esa configuración antes de atender herramientas y SHALL no usar ninguna de las dos claves

### Requirement: El fallback local reemplaza íntegramente un ranking remoto fallido

Si falta la clave de la ruta elegida, ocurre un error HTTP o de red, timeout, JSON inválido, respuesta fuera del esquema o falta una respuesta esperada, el servidor SHALL puntuar todos los candidatos localmente por solapamiento léxico. SHALL descartar puntuaciones Jev parciales, no mezclar escalas y SHALL informar `method: local_fallback`, `score_kind: lexical_overlap`, `provider_route`, una razón de fallback segura y el número de solicitudes intentadas. No SHALL probar la otra ruta remota, aunque su clave exista. Las puntuaciones SHALL presentarse como orientación, no como probabilidades ni garantías calibradas.

#### Scenario: No hay clave de TypeSafe
- **WHEN** se clasifica una lista de candidatos con la ruta directa elegida y sin `TYPESAFE_API_KEY`
- **THEN** SHALL devolver ranking léxico sin realizar solicitudes de red y SHALL indicar cero solicitudes y fallback local

#### Scenario: Falla un lote posterior al primero
- **WHEN** un lote remoto posterior falla después de haber producido puntuaciones válidas para lotes anteriores
- **THEN** SHALL descartar todas las puntuaciones remotas de esa operación y SHALL recalcular localmente la lista completa

#### Scenario: El proveedor devuelve datos inválidos o detalles sensibles
- **WHEN** el proveedor devuelve contenido inválido o un error que contiene datos privados
- **THEN** SHALL usar el fallback local y SHALL omitir cuerpos de respuesta, credenciales y detalles remotos sensibles del resultado

#### Scenario: Falta la clave de Vercel y existe la de TypeSafe
- **WHEN** `JEV_PROVIDER=vercel`, falta `AI_GATEWAY_API_KEY` y existe `TYPESAFE_API_KEY`
- **THEN** SHALL usar sólo ranking local, informar que falta la credencial de la ruta elegida y SHALL no contactar a TypeSafe

#### Scenario: Vercel falla y TypeSafe está disponible
- **WHEN** una solicitud a AI Gateway falla y también existe una clave directa de TypeSafe
- **THEN** SHALL usar el fallback local para todos los candidatos y SHALL no enviar una solicitud adicional al endpoint directo
