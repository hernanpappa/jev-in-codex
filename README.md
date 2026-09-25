# jev-in-codex

Usá [Jev](https://docs.typesafe.ai/) para ordenar capacidades y evidencia dentro
de un flujo de trabajo existente de Codex. Un servidor MCP local expone cuatro
herramientas y una habilidad complementaria explica cuándo usarlas.

**Estado: MVP experimental.** Incluye pruebas funcionales de protocolo y de
límites. La calidad del ranking y los ahorros de tiempo o tokens no han sido
evaluados con benchmarks. Es una integración independiente, no un producto
oficial de OpenAI ni de TypeSafe.

## Qué hace

| Herramienta | Entrada | Salida |
| --- | --- | --- |
| `jev_select_capability` | Objetivo y un catálogo provisto de herramientas o habilidades | Candidatos ordenados, con opción de no recomendar ninguno |
| `jev_search` | Pregunta, alcance del workspace y términos de consulta opcionales | Extractos de código o documentación reordenados, con rutas y números de línea |
| `jev_triage` | Pregunta y un artefacto de salida guardado | Extractos originales relevantes, grupos de duplicados exactos y cobertura |
| `jev_create_checkpoint` | Objetivo y mensajes de conversación provistos explícitamente | Pasajes originales acotados, referencias, puntuaciones y cobertura; no compacta el historial activo |

Codex aporta el objetivo y toma la decisión final. El servidor recupera
candidatos acotados localmente, le hace preguntas de relevancia a Jev y devuelve
evidencia original. No ejecuta las capacidades seleccionadas ni intercepta
llamadas arbitrarias a herramientas de Codex. El plugin local puede guardar un
checkpoint extractivo antes de la compactación nativa y devolverlo en la
continuación; Codex conserva el control de cuándo compactar. Jev no observa el
porcentaje exacto de contexto ni impone un umbral por cantidad de mensajes, y
tampoco expone su catálogo interno de contexto o herramientas.

```text
Codex → herramienta MCP → candidatos locales → evaluación de relevancia de Jev
                                      ← evidencia original ordenada + cobertura ←
```

La primera versión de triage ordena pasajes y agrupa fragmentos idénticos. La
agrupación semántica de fallas y la clasificación de causas raíz quedan para
trabajo futuro.

## Demo

![Demostración local animada de selección de capacidades, búsqueda de código y triage de logs](docs/assets/jev-demo.gif)

Reproducción animada de resultados MCP reales con datos sintéticos y respuestas
simuladas de TypeSafe. La reproducción se ralentizó para facilitar la lectura;
no es una captura en vivo de la UI de Codex ni un benchmark de latencia.
[Vista previa estática](docs/assets/jev-demo.png).

## Instalación

Entregale este prompt a tu sesión de Codex, abierta en el proyecto donde querés
usar la integración:

```text
Instalá la rama jev-coding-codex-tools de
https://github.com/hernanpappa/jev-in-codex para el proyecto actual siguiendo
docs/INSTALL.md. Configurá dependencias, plugin local de Codex con sus hooks,
conexión MCP y habilidad incluida. Integrá docs/AGENTS.jev.md en las instrucciones
persistentes del proyecto, preservando las existentes. Verificá las cuatro tools
y los hooks; pedime que revise y confíe los hooks mediante el flujo normal de
Codex, sin omitir su revisión. Configurá TypeSafe de forma privada, pero mantené
local el procesamiento de checkpoints aunque la clave API esté configurada.
No habilites JEV_ALLOW_CHECKPOINT_EGRESS salvo que autorice explícitamente enviar
extractos de conversación a TypeSafe. Informá si Jev o el fallback local está
activo y si necesitás que ingrese la clave, confíe los hooks o reinicie Codex.
```

Jev usa una clave de API de TypeSafe y envía a TypeSafe los extractos
seleccionados de código o logs. Los extractos de conversación para checkpoints
se mantienen locales, salvo autorización separada. Codex se ocupa de la
instalación; quizás tengas que ingresar la clave de forma privada, confiar los
hooks o reiniciar Codex.

<details>
<summary>Instalación y configuración manual</summary>

## Instalar desde el código fuente

Requiere **Node.js 22+**, **npm** y **ripgrep (`rg`)** disponible en `PATH`.

```bash
git clone --branch jev-coding-codex-tools https://github.com/hernanpappa/jev-in-codex.git
cd jev-in-codex
npm ci --ignore-scripts
npm run check
```

Todavía no existe un paquete publicado en npm. `private: true` evita una
publicación accidental en npm; el código fuente es público bajo licencia MIT.

### Configurar el MCP de Codex

Agregá una entrada al `config.toml` de Codex y sustituí ambas rutas absolutas:

```toml
[mcp_servers.jev]
command = "node"
args = ["/absolute/path/to/jev-in-codex/dist/index.js", "--root", "/absolute/path/to/your-project"]
env_vars = ["TYPESAFE_API_KEY", "JEV_MODEL", "JEV_ALLOW_CHECKPOINT_EGRESS"]
tool_timeout_sec = 90
```

Exportá `TYPESAFE_API_KEY` en el entorno que inicia Codex. Obtené la clave
en TypeSafe; no la incluyas en el control de versiones ni en un prompt. De forma
opcional, configurá `JEV_MODEL` con el nombre de un modelo fijado; el
valor predeterminado es `jev-latest`.

Los checkpoints usan ranking local incluso si existe la clave. Sólo si querés
enviar extractos conversacionales a TypeSafe, habilitá por separado
`JEV_ALLOW_CHECKPOINT_EGRESS=true` en el entorno del proceso que ejecuta el MCP
y en el entorno de Codex que ejecuta los hooks. La variable debe permanecer
ausente si no aprobaste esa divulgación.

El directorio raíz es obligatorio, para que el servidor no pueda analizar
silenciosamente un directorio de trabajo no deseado. Cambiá `--root` para
otro proyecto, u omitilo, configurá `JEV_WORKSPACE_ROOT` e incluí ese
nombre en `env_vars`. Un `--root` explícito tiene precedencia.
Usá una ruta absoluta al ejecutable de Node si el entorno que inicia Codex no
puede encontrar `node`.

Sin una clave de TypeSafe, las cuatro herramientas funcionan en **modo de fallback
local**. Esto permite comprobar la instalación, pero no demuestra la calidad del
ranking de Jev. El acceso y la facturación habituales de Codex no cambian. Las
solicitudes de Jev usan una cuenta de API de TypeSafe independiente; esta
integración no las enruta a través de una suscripción de Codex.

Consultá la [documentación de MCP para Codex](https://developers.openai.com/codex/mcp/)
para conocer la configuración y visibilidad del servidor en tu cliente.

### Agregar la habilidad complementaria

Copiá `skills/jev-assist` al directorio `.agents/skills/` de tu
proyecto de código (o a tu directorio personal de habilidades) y luego iniciá
una sesión nueva de Codex. Por ejemplo, desde este repositorio:

```bash
mkdir -p /absolute/path/to/your-project/.agents/skills
cp -R skills/jev-assist /absolute/path/to/your-project/.agents/skills/
```

Revisá un directorio de habilidades existente antes de reemplazarlo. La habilidad
usa Jev sólo cuando seleccionar o filtrar resulta útil; las búsquedas exactas
simples siguen usando `rg`.

### Plugin local de Codex

El manifiesto `.codex-plugin/plugin.json` agrupa la habilidad, la conexión MCP y
los hooks `PreCompact` y `SessionStart(source=compact)`. Seguí
[`docs/INSTALL.md`](docs/INSTALL.md) para el marketplace local, la instalación y
la revisión de confianza de los hooks. Codex no los ejecuta hasta que el usuario
revise y confíe las definiciones actuales. No combines esta ruta con otra
conexión MCP o una segunda copia de la habilidad. Si usás sólo la configuración
MCP directa, la herramienta manual de checkpoint está disponible, pero los hooks
automáticos del plugin no se instalan.

</details>

## Ejemplos

Pedile a Codex: “Usá Jev para seleccionar entre estas capacidades disponibles al
rastrear por qué las solicitudes agotan su tiempo de espera”. La llamada MCP
puede verse así:

```json
{
  "objective": "Rastrear el origen de los tiempos de espera de solicitudes",
  "candidates": [
    { "id": "read_logs", "kind": "tool", "description": "Leer logs recientes con marcas de tiempo y errores" },
    { "id": "design_assets", "kind": "skill", "description": "Crear recursos visuales para la interfaz" }
  ],
  "limit": 2
}
```

Quien llama debe proporcionar IDs y descripciones reales de las capacidades
disponibles. El servidor no puede ver automáticamente el catálogo completo de
herramientas o habilidades de Codex.

Buscá contexto de implementación:

```json
{
  "question": "¿Dónde se implementa el backoff de reintentos para solicitudes salientes?",
  "scope": ["src"],
  "query_terms": ["retry", "backoff", "timeout"],
  "limit": 5
}
```

Hacé triage de una salida ya guardada dentro del workspace:

```json
{
  "question": "¿Qué fallas explican por qué fallaron las pruebas de integración de la base de datos?",
  "artifact_path": "test-output.txt",
  "limit": 4
}
```

Creá un checkpoint manual con mensajes sintéticos o el contexto que el usuario
quiera preservar:

```json
{
  "objective": "Preservar la decisión y las restricciones para continuar el cambio",
  "messages": [
    { "id": "turn-12", "role": "user", "text": "Mantener la migración reversible y no cambiar el contrato API." },
    { "id": "turn-13", "role": "assistant", "text": "La migración se desplegará en dos fases." }
  ],
  "limit": 8
}
```

El resultado contiene pasajes originales con rol, referencia, offsets y
puntuación. No redacta un resumen ni modifica la conversación activa.

Por ejemplo, en Bash, capturá la salida de un comando sin perder su estado:

```bash
set -o pipefail
npm test 2>&1 | tee test-output.txt
```

La herramienta de triage lee el artefacto; no ejecuta el comando. Usá
`start_line` y `end_line` para seleccionar un rango de líneas
relevante. Las salidas preservan las ubicaciones de origen para que Codex pueda
inspeccionar la evidencia circundante antes de actuar.

## Comportamiento y límites

- **Ranking:** preguntas de relevancia `noul` de Jev independientes,
  agrupadas de a cuatro candidatos por solicitud. Hasta 24 candidatos por
  operación, tiempo de espera de ocho segundos por solicitud, límite de 28.000
  bytes por solicitud y sin reintentos automáticos. Las recomendaciones de
  capacidades requieren una puntuación de Jev de al menos 0,5; es una heurística
  provisional, no calibrada.
- **Fallback:** una clave ausente, errores del proveedor, respuestas inválidas o
  un lote fallido hacen que todo el ranking use coincidencia léxica.
  `method`, `score_kind`, `fallback_reason` y
  `api_requests` lo hacen visible. Las puntuaciones locales no son
  probabilidades del modelo. Las respuestas exitosas identifican el modelo del
  proveedor cuando se informa. Las puntuaciones son orientativas en ambos modos.
- **Búsqueda:** el descubrimiento de archivos con ripgrep respeta las reglas de
  ignore; luego, las coincidencias léxicas locales arman una lista corta de hasta
  24 extractos. En cada llamada se examinan como máximo 500 archivos elegibles y
  aproximadamente 20 MiB (el archivo final puede cruzar el umbral de bytes). La
  búsqueda no es un índice semántico. La cobertura informa datos no leídos,
  omitidos, coincidentes y preseleccionados. Ampliá los términos de consulta o
  acotá el alcance cuando el recall sea insuficiente.
- **Artefactos:** archivos de texto UTF-8 regulares de hasta 1 MiB; se rechazan
  los bytes nulos. Los extractos preservan líneas completas, con un máximo de 30
  líneas y 4.000 bytes cada uno. Las líneas demasiado extensas se rechazan
  durante el triage; esos archivos se omiten durante la búsqueda. No hay
  solapamiento entre fragmentos, por lo que debés leer las líneas circundantes
  cuando la evidencia cruce límites. La selección de rango ocurre después de
  comprobar el límite de 1 MiB.
- **Triage:** todos los fragmentos del rango solicitado se agrupan por texto
  exacto. Cuando quedan más de 24 fragmentos distintos, la coincidencia léxica
  selecciona la lista corta. Los conteos revelan los fragmentos no examinados.
  Se devuelven hasta 20 ubicaciones por grupo, junto con el conteo total y el de
  ubicaciones omitidas. Los extractos idénticos no prueban que dos fallas tengan
  la misma causa; los originales no modificados permanecen en disco.
- **Contexto devuelto:** como máximo diez extractos o capacidades por respuesta.
  Una lista corta truncada nunca demuestra que la evidencia omitida sea
  irrelevante.
- **Checkpoints:** hasta 200 mensajes y 120.000 caracteres provistos; el hook lee
  como máximo el último MiB del transcript. Los mensajes se segmentan en pasajes
  de hasta 1.000 caracteres, se evalúan hasta 24 localmente y se devuelven hasta
  ocho (máximo 8.000 caracteres). La evaluación remota, si se autoriza por
  separado, usa como máximo cuatro candidatos por evento. Los checkpoints se
  guardan fuera del repo en `PLUGIN_DATA`, vencen a las 24 horas y se eliminan
  después de restaurarlos.
- **Alcance:** sólo rutas relativas; las rutas resueltas deben permanecer dentro
  del directorio raíz configurado. Se excluyen directorios habituales de
  dependencias o compilación y nombres de archivos de credenciales. Las lecturas
  explícitas de artefactos pueden acceder a archivos ignorados por Git, mientras
  que la búsqueda respeta las reglas de ignore. Configurá un directorio raíz
  acotado, no tu directorio personal.

## Tratamiento de datos

Con `TYPESAFE_API_KEY` configurada, los objetivos, las descripciones de
capacidades suministradas y los extractos preseleccionados de código o logs se
envían por HTTPS a `https://api.typesafe.ai/v1/systemone`. La búsqueda
primero lee los archivos localmente y sólo envía su lista corta. El triage lee y
agrupa el rango solicitado localmente antes de enviar su lista corta. No se
proporciona una anulación del endpoint remoto.

Los transcripts de Codex se leen localmente sólo desde el hook `PreCompact`; el
hook conserva exclusivamente los pasajes seleccionados en el directorio privado
del plugin y los entrega como contexto no confiable tras la compactación nativa.
La clave TypeSafe no autoriza ese envío: el ranking del checkpoint sigue local,
salvo que el usuario habilite de forma explícita `JEV_ALLOW_CHECKPOINT_EGRESS`.

Las exclusiones por nombre de archivo se aplican de mejor esfuerzo y no detectan
secretos dentro de archivos comunes. Usá la integración sólo con contenido
autorizado para TypeSafe. El contenido recuperado puede incluir inyección de
prompts; el ranking no puede establecer que sea seguro ejecutarlo. Este servidor
es un límite de conveniencia local, no un sandbox frente a modificaciones
concurrentes y maliciosas del sistema de archivos. No tiene telemetría, caché
persistente ni registro propio del contenido. El tratamiento de los datos de API
por parte de TypeSafe se rige por sus propios términos de servicio. Los cuerpos
de error del proveedor no se exponen en los resultados de las herramientas.

## Revisión de seguridad

La [revisión estática de seguridad del 19-09-2026](docs/security-review-2026-09-19/report.md)
no encontró vulnerabilidades confirmadas y reportables en la implementación
inicial. El informe registra el commit analizado, las hipótesis de confianza, las
oportunidades de endurecimiento y las exclusiones. No es una garantía de
seguridad ni un análisis en vivo de avisos de dependencias.

## Contribuir

Consultá [CONTRIBUTING.md](CONTRIBUTING.md) para conocer el desarrollo, las
pruebas locales y la guía de benchmarking.

## Licencia y créditos

[MIT](LICENSE). Esta integración pequeña usa una licencia permisiva para
facilitar su adopción y reutilización. Apache-2.0 agrega una concesión explícita
de patentes de colaboradores y requisitos adicionales de notificación; es una
alternativa razonable para un proyecto mayor y sensible a patentes. Consultá el
[texto de MIT](https://opensource.org/license/mit) y el
[texto de Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

Inspirado en [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction)
y en el enfoque Jev de TypeSafe. Este repositorio implementa su propia
integración; no incluye el código del compactador de ese proyecto.

Referencias: [API de TypeSafe](https://docs.typesafe.ai/api),
[SDK de MCP para TypeScript](https://ts.sdk.modelcontextprotocol.io/) y
[MCP de Codex](https://developers.openai.com/codex/mcp/).
