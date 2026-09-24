# Spec Delta

## Purpose

Establecer las fronteras de lectura del workspace y de divulgación de datos de Jev, para que el usuario y Codex puedan valorar qué contenido se expone y qué autoridad conserva el servidor.

## ADDED Requirements

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
