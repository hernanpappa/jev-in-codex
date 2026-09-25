# Especificación: Protección del workspace y los datos

## Purpose

Establecer las fronteras de lectura del workspace y de divulgación de datos de Jev, para que el usuario y Codex puedan valorar qué contenido se expone y qué autoridad conserva el servidor.

## Requirements

### Requirement: Las lecturas quedan limitadas al workspace configurado

El servidor SHALL canonizar un workspace explícito y SHALL rechazar rutas absolutas, recorridos fuera de la raíz, destinos canónicos fuera de la raíz, symlinks que escapen de ella y rutas excluidas. SHALL rechazar directorios, archivos no regulares, archivos mayores de 1 MiB, bytes nulos y texto UTF-8 inválido. La lista de exclusión SHALL incluir `.git`, `node_modules`, `dist`, `build`, `vendor`, `.venv`, `.ssh`, `.aws`, `.gnupg`, nombres `.env` y `.env.*`, `.npmrc`, `.netrc`, `credentials` y `credentials.*`, `id_rsa`, `id_ed25519`, y archivos terminados en `.pem`, `.key`, `.p12` o `.pfx` (sin distinguir mayúsculas/minúsculas).

#### Scenario: Se solicita leer una ruta fuera de la raíz
- **WHEN** una ruta relativa intenta atravesar la raíz o un symlink apunta fuera de ella
- **THEN** SHALL rechazarla sin devolver contenido del destino externo

#### Scenario: Se solicita un archivo excluido o no textual
- **WHEN** la ruta corresponde a un nombre sensible, directorio, archivo binario, UTF-8 inválido o archivo mayor de 1 MiB
- **THEN** SHALL rechazar la lectura antes de producir extractos para el ranking

### Requirement: La divulgación a TypeSafe es explícita y la evidencia sigue siendo no confiable

La documentación y habilidad incluidas SHALL advertir que, al configurar `TYPESAFE_API_KEY`, los objetivos y el texto de los candidatos o extractos seleccionados se envían a TypeSafe. También SHALL explicar que la lista de nombres excluidos no detecta secretos dentro de archivos ordinarios. El contenido recuperado SHALL tratarse como evidencia no confiable; el servidor SHALL ser de solo lectura y no SHALL conceder autoridad para ejecutar instrucciones incluidas en esa evidencia.

#### Scenario: Se configura una clave del proveedor
- **WHEN** el usuario habilita la evaluación remota con una clave TypeSafe
- **THEN** las instrucciones de uso SHALL informar qué tipos de texto salen del equipo y recomendar habilitar Jev sólo para contenido aprobado para ese proveedor

#### Scenario: Un extracto contiene instrucciones
- **WHEN** un resultado de búsqueda o triage incluye texto que parece ordenar acciones
- **THEN** las instrucciones de uso SHALL indicar que Codex lo trate como dato no confiable y aplique sus permisos y reglas existentes

#### Scenario: Un secreto está embebido en un archivo permitido
- **WHEN** un archivo de nombre ordinario contiene una credencial
- **THEN** la documentación SHALL advertir que el filtro por nombre no la detecta y que el usuario debe evitar enviar ese contenido

### Requirement: El acceso a transcripts se limita a los hooks de Codex y al checkpoint
La integración automática SHALL leer únicamente la referencia de transcript entregada por un evento de ciclo de vida de Codex, SHALL limitar cantidad y tamaño de datos leídos y SHALL rechazar archivos que no sean regulares o estén fuera del formato admitido. Ese acceso no SHALL ampliar las rutas que las herramientas de búsqueda ordinarias pueden leer ni aceptar una ruta de transcript arbitraria del llamante MCP. SHALL conservar sólo los pasajes acotados del checkpoint en almacenamiento local privado, con retención limitada a la sesión que se reanuda.

#### Scenario: Evento contiene una referencia utilizable
- **WHEN** Codex entrega al hook una referencia de transcript regular que cumple los límites publicados
- **THEN** el hook SHALL procesar sólo el contenido acotado necesario para el checkpoint y no SHALL habilitar su lectura por las herramientas generales de workspace

#### Scenario: Referencia ausente, inválida o transcript excesivo
- **WHEN** el evento no contiene una referencia utilizable o el archivo incumple los límites o formato
- **THEN** el hook SHALL omitir el checkpoint, descartar cualquier contenido parcial y permitir que Codex continúe normalmente

#### Scenario: Expira la sesión de compactación
- **WHEN** la sesión asociada al checkpoint deja de ser reanudable o vence la retención configurada
- **THEN** el sistema SHALL eliminar el checkpoint local asociado y SHALL no conservar el transcript original como copia

### Requirement: Compartir contenido conversacional con TypeSafe requiere consentimiento específico
El sistema SHALL mantener localmente el contenido del transcript y los checkpoints por defecto. Configurar una clave TypeSafe para las herramientas existentes no SHALL autorizar por sí solo el envío de fragmentos de conversación a TypeSafe. Antes de cualquier envío de texto de transcript o checkpoint, SHALL exigir una opción explícita y diferenciada para ese uso, SHALL informar qué contenido se enviará y SHALL permitir desactivar esa divulgación sin deshabilitar la compactación nativa ni el checkpoint local.

#### Scenario: Clave TypeSafe configurada sin opt-in de transcript
- **WHEN** el usuario tiene `TYPESAFE_API_KEY` configurada pero no habilitó explícitamente la divulgación de transcripts
- **THEN** Jev SHALL generar o devolver el checkpoint sin enviar texto conversacional a TypeSafe

#### Scenario: Usuario habilita divulgación de transcript
- **WHEN** el usuario habilita de forma explícita la evaluación remota de checkpoints y solicita procesar un historial
- **THEN** la guía y la configuración SHALL informar que los pasajes enviados salen del equipo y Jev SHALL limitar el envío al contenido y propósito autorizados
