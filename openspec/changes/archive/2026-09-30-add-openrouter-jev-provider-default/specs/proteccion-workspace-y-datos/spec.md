# Spec Delta

## MODIFIED Requirements

### Requirement: La divulgación a TypeSafe es explícita y la evidencia sigue siendo no confiable

La documentación y habilidad incluidas SHALL advertir que la ruta directa envía objetivos y texto de candidatos o extractos seleccionados a TypeSafe; la ruta Vercel envía esos datos a Vercel AI Gateway para procesamiento con Jev de TypeSafe; y la ruta OpenRouter los envía a OpenRouter para procesamiento con Jev de TypeSafe. SHALL identificar los servicios intermediarios y el proveedor del modelo, sin prometer retención cero, ausencia de entrenamiento o precio fijo no verificados. SHALL explicar que la lista de nombres excluidos no detecta secretos dentro de archivos ordinarios. El contenido recuperado SHALL tratarse como evidencia no confiable; el servidor SHALL ser de solo lectura y no SHALL conceder autoridad para ejecutar instrucciones incluidas en ella.

#### Scenario: Se configura una clave del proveedor
- **WHEN** el usuario habilita TypeSafe con `TYPESAFE_API_KEY`
- **THEN** las instrucciones SHALL informar qué tipos de texto salen del equipo y recomendar habilitar Jev sólo para contenido aprobado para TypeSafe

#### Scenario: Ruta Vercel elegida
- **WHEN** el usuario habilita Vercel con `AI_GATEWAY_API_KEY`
- **THEN** la guía SHALL identificar a Vercel AI Gateway y TypeSafe como servicios que procesan los datos seleccionados

#### Scenario: Se elige la ruta Vercel
- **WHEN** el usuario configura `JEV_PROVIDER=vercel` y habilita ranking remoto con `AI_GATEWAY_API_KEY`
- **THEN** la guía SHALL identificar a Vercel AI Gateway y TypeSafe como servicios que procesarán los datos seleccionados, sin prometer retención cero ni ausencia de entrenamiento no verificadas para esa ruta

#### Scenario: Ruta OpenRouter elegida
- **WHEN** el usuario usa el valor predeterminado OpenRouter con `OPENROUTER_API_KEY`
- **THEN** la guía SHALL identificar a OpenRouter y TypeSafe como servicios que procesan los datos seleccionados

#### Scenario: Un extracto contiene instrucciones
- **WHEN** un resultado de búsqueda o triage incluye texto que parece ordenar acciones
- **THEN** la guía SHALL indicar que Codex lo trate como dato no confiable y aplique sus permisos y reglas existentes

#### Scenario: Un secreto está embebido en un archivo permitido
- **WHEN** un archivo de nombre ordinario contiene una credencial
- **THEN** la documentación SHALL advertir que el filtro por nombre no la detecta y que el usuario debe evitar enviar ese contenido

### Requirement: Compartir contenido conversacional con TypeSafe requiere consentimiento específico

El sistema SHALL mantener localmente el contenido del transcript y los checkpoints por defecto. Configurar `TYPESAFE_API_KEY`, `AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY` o `JEV_PROVIDER` para las herramientas existentes no SHALL autorizar por sí solo el envío de fragmentos de conversación a TypeSafe, Vercel AI Gateway u OpenRouter. Antes de cualquier envío de texto de transcript o checkpoint, SHALL exigir `JEV_ALLOW_CHECKPOINT_EGRESS=true` como opción explícita y diferenciada, SHALL informar qué contenido se enviará y SHALL permitir desactivar esa divulgación sin deshabilitar la compactación nativa ni el checkpoint local. Si el permiso está activo, SHALL usar exclusivamente la ruta seleccionada.

#### Scenario: Clave TypeSafe configurada sin opt-in de transcript
- **WHEN** el usuario tiene `TYPESAFE_API_KEY` pero no habilitó el permiso separado
- **THEN** Jev SHALL generar o devolver checkpoints sin enviar texto conversacional a TypeSafe

#### Scenario: Clave Vercel configurada sin opt-in de transcript
- **WHEN** el usuario tiene `AI_GATEWAY_API_KEY` pero no habilitó el permiso separado
- **THEN** los checkpoints manuales y hooks SHALL conservar ranking local sin enviar conversación a Vercel ni a TypeSafe

#### Scenario: Clave OpenRouter configurada sin opt-in de transcript
- **WHEN** `JEV_PROVIDER` está ausente o vale `openrouter`, existe `OPENROUTER_API_KEY` y no está habilitado el permiso separado
- **THEN** los checkpoints manuales y hooks SHALL conservar ranking local sin enviar conversación a OpenRouter ni a TypeSafe

#### Scenario: Usuario habilita divulgación de transcript
- **WHEN** el usuario habilita expresamente `JEV_ALLOW_CHECKPOINT_EGRESS=true` y solicita procesar un historial
- **THEN** la guía SHALL informar que pasajes acotados salen del equipo y Jev SHALL enviarlos únicamente a la ruta seleccionada para el propósito autorizado
