# Spec Delta

## MODIFIED Requirements

### Requirement: La divulgación a TypeSafe es explícita y la evidencia sigue siendo no confiable

La documentación y habilidad incluidas SHALL advertir que la ruta directa envía objetivos y texto de candidatos o extractos seleccionados a TypeSafe, y que la ruta Vercel envía esos mismos datos a Vercel AI Gateway para procesarlos mediante el modelo Jev de TypeSafe. SHALL explicar que Vercel proporciona acceso y facturación, pero no evita que TypeSafe sea el proveedor del modelo; también SHALL advertir que la lista de nombres excluidos no detecta secretos dentro de archivos ordinarios. El contenido recuperado SHALL tratarse como evidencia no confiable; el servidor SHALL ser de solo lectura y no SHALL conceder autoridad para ejecutar instrucciones incluidas en esa evidencia.

#### Scenario: Se configura una clave del proveedor
- **WHEN** el usuario habilita la evaluación remota con una clave TypeSafe
- **THEN** las instrucciones de uso SHALL informar qué tipos de texto salen del equipo y recomendar habilitar Jev sólo para contenido aprobado para ese proveedor

#### Scenario: Un extracto contiene instrucciones
- **WHEN** un resultado de búsqueda o triage incluye texto que parece ordenar acciones
- **THEN** las instrucciones de uso SHALL indicar que Codex lo trate como dato no confiable y aplique sus permisos y reglas existentes

#### Scenario: Un secreto está embebido en un archivo permitido
- **WHEN** un archivo de nombre ordinario contiene una credencial
- **THEN** la documentación SHALL advertir que el filtro por nombre no la detecta y que el usuario debe evitar enviar ese contenido

#### Scenario: Se elige la ruta Vercel
- **WHEN** el usuario configura `JEV_PROVIDER=vercel` y habilita ranking remoto con `AI_GATEWAY_API_KEY`
- **THEN** la guía SHALL identificar a Vercel AI Gateway y TypeSafe como servicios que procesarán los datos seleccionados, sin prometer retención cero ni ausencia de entrenamiento no verificadas para esa ruta

### Requirement: Compartir contenido conversacional con TypeSafe requiere consentimiento específico

El sistema SHALL mantener localmente el contenido del transcript y los checkpoints por defecto. Configurar `TYPESAFE_API_KEY`, `AI_GATEWAY_API_KEY` o `JEV_PROVIDER` para las herramientas existentes no SHALL autorizar por sí solo el envío de fragmentos de conversación a TypeSafe ni a Vercel AI Gateway. Antes de cualquier envío de texto de transcript o checkpoint, SHALL exigir `JEV_ALLOW_CHECKPOINT_EGRESS=true` como opción explícita y diferenciada, SHALL informar qué contenido se enviará y SHALL permitir desactivar esa divulgación sin deshabilitar la compactación nativa ni el checkpoint local. Si el permiso está activo, SHALL usar exclusivamente la ruta seleccionada.

#### Scenario: Clave TypeSafe configurada sin opt-in de transcript
- **WHEN** el usuario tiene `TYPESAFE_API_KEY` configurada pero no habilitó explícitamente la divulgación de transcripts
- **THEN** Jev SHALL generar o devolver el checkpoint sin enviar texto conversacional a TypeSafe

#### Scenario: Usuario habilita divulgación de transcript
- **WHEN** el usuario habilita de forma explícita la evaluación remota de checkpoints y solicita procesar un historial
- **THEN** la guía y la configuración SHALL informar que los pasajes enviados salen del equipo y Jev SHALL limitar el envío al contenido y propósito autorizados

#### Scenario: Clave Vercel configurada sin opt-in de transcript
- **WHEN** `JEV_PROVIDER=vercel` y existe `AI_GATEWAY_API_KEY`, pero no existe el permiso separado de divulgación conversacional
- **THEN** los checkpoints manuales y los hooks SHALL conservar ranking local sin enviar pasajes conversacionales a Vercel ni a TypeSafe
