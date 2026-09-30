# Especificación: Instalación y guía de Codex

## Purpose

Documentar cómo instalar y conectar la integración heredada de Jev en un proyecto Codex, y cómo la guía complementaria decide cuándo usar las tres herramientas sin convertirlas en un paso obligatorio para cada tarea.

## Requirements

### Requirement: La instalación declara sus dependencias y métodos soportados

La guía SHALL declarar como requisitos Node.js 22 o posterior, npm y ripgrep disponible como `rg`, y SHALL indicar la instalación desde el código fuente con scripts de dependencias deshabilitados y verificación local. SHALL describir el plugin Codex incluido como empaquetado heredado, diferenciarlo de un marketplace y presentar la configuración MCP directa como el transporte verificado. SHALL identificar la instalación por UI de plugin como no verificada de extremo a extremo.

#### Scenario: El usuario prepara una instalación local
- **WHEN** el usuario sigue la guía de instalación desde el código fuente
- **THEN** SHALL poder identificar los prerequisitos, los comandos de preparación y el comando de verificación antes de conectar Codex

#### Scenario: El usuario instala el plugin de Codex
- **WHEN** el usuario selecciona la ruta de plugin heredado
- **THEN** la guía SHALL advertir que el repositorio no es un marketplace y que esa ruta por sí sola no instala Node, dependencias ni ripgrep

### Requirement: La habilidad complementaria usa Jev sólo cuando filtrar aporta valor

La habilidad SHALL reservar `jev_select_capability` para catálogos reales con opciones plausibles, `jev_search` para búsquedas de contexto ambiguas y `jev_triage` para salidas guardadas sustanciales. SHALL preferir búsqueda exacta normal para identificadores o literales, no SHALL asumir acceso a un catálogo global y SHALL continuar con herramientas normales si Jev no está disponible o el filtro no ayuda. SHALL indicar cómo interpretar método, cobertura, omisiones y puntuaciones.

#### Scenario: Una tarea requiere un lookup exacto simple
- **WHEN** el usuario busca un identificador o literal conocido
- **THEN** la guía SHALL dirigir a Codex a `rg` o lectura normal en lugar de requerir una llamada Jev

#### Scenario: Jev no está disponible o usa fallback
- **WHEN** las herramientas MCP no están disponibles o la respuesta informa `local_fallback`
- **THEN** la guía SHALL permitir continuar con herramientas normales y SHALL describir el resultado como ranking léxico si corresponde

#### Scenario: La cobertura deja evidencia sin examinar
- **WHEN** una búsqueda o triage informa archivos o fragmentos omitidos/no evaluados
- **THEN** SHALL indicar que la ausencia de resultados no prueba ausencia de evidencia y SHALL guiar a ampliar la búsqueda o leer el artefacto original

### Requirement: La instalación configura y explica los hooks de checkpoint
La guía SHALL documentar cómo instalar, inspeccionar, deshabilitar y verificar la herramienta manual y los hooks de Codex para preparar y restaurar checkpoints. SHALL aclarar que el umbral y la ejecución de compactación pertenecen a Codex, que un contador de mensajes no equivale a porcentaje de contexto y que el checkpoint manual no compacta la conversación. SHALL explicar la continuidad sin Jev si hooks, transcript o proveedor no están disponibles.

#### Scenario: Instalación de hooks en el proyecto
- **WHEN** el usuario sigue la guía para habilitar la integración de checkpoints
- **THEN** podrá identificar los eventos configurados, el almacenamiento local, los permisos de transcript solicitados y cómo validar cada hook sin enviar una conversación de prueba a un proveedor remoto

#### Scenario: Usuario revisa o desactiva la integración
- **WHEN** el usuario necesita auditar o deshabilitar los checkpoints automáticos
- **THEN** la guía SHALL indicar dónde inspeccionar la configuración y cómo desactivarla conservando la compactación nativa de Codex

### Requirement: La instalación permite elegir y verificar una sola ruta de Jev

La guía SHALL conservar los pasos de instalación local de Vercel AI Gateway sin requerir un despliegue en Vercel ni un token de despliegue, y SHALL presentar TypeSafe directo como ruta explícita con `JEV_PROVIDER=typesafe`. SHALL aclarar que instalaciones anteriores que dependían de TypeSafe con `JEV_PROVIDER` ausente necesitan fijar esa variable para conservarlo, porque el valor predeterminado actualizado es OpenRouter. SHALL indicar cómo configurar la misma selección en el MCP y los hooks, reconocer `provider_route` y `method` en pruebas con datos sintéticos, distinguir verificación local de una solicitud autenticada real y mantener `JEV_ALLOW_CHECKPOINT_EGRESS` desactivado salvo consentimiento separado.

#### Scenario: Instalación anterior con TypeSafe
- **WHEN** el usuario conserva `TYPESAFE_API_KEY` y no define `JEV_PROVIDER`
- **THEN** la guía SHALL advertir que el valor predeterminado actualizado es OpenRouter y SHALL indicar `JEV_PROVIDER=typesafe` para conservar la ruta directa

#### Scenario: Instalación local con AI Gateway
- **WHEN** el usuario elige Vercel para un servidor MCP local
- **THEN** la guía SHALL indicar `JEV_PROVIDER=vercel` y `AI_GATEWAY_API_KEY` como datos necesarios para el ranking remoto, sin solicitar un proyecto desplegado en Vercel ni `TYPESAFE_API_KEY`

#### Scenario: Verificación con ambas claves presentes
- **WHEN** se prueban herramientas con credenciales de TypeSafe y Vercel en el entorno
- **THEN** la guía SHALL exigir verificar que `provider_route` identifica la única ruta seleccionada y que la otra ruta no recibe solicitudes

#### Scenario: Checkpoint sin consentimiento remoto
- **WHEN** el usuario configura una credencial remota sin `JEV_ALLOW_CHECKPOINT_EGRESS=true`
- **THEN** la guía SHALL indicar que los checkpoints permanecen locales en el MCP y los hooks

### Requirement: La instalación ofrece tres rutas y hace explícita la migración del valor predeterminado

La guía SHALL documentar `JEV_PROVIDER=openrouter|typesafe|vercel`, con `openrouter` como valor predeterminado cuando la variable no está definida, y SHALL indicar `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY` y `AI_GATEWAY_API_KEY` como credenciales privadas de sus respectivas rutas. SHALL explicar que sólo la clave seleccionada se usa aunque existan varias, que las herramientas no cambian automáticamente de ruta y que el MCP continúa ejecutándose localmente. SHALL advertir que las instalaciones anteriores sin `JEV_PROVIDER` pasan de TypeSafe directo a OpenRouter al actualizar; para conservar el comportamiento anterior deberán fijar `JEV_PROVIDER=typesafe`. SHALL indicar cómo configurar la misma selección para el MCP y los hooks, mantener `JEV_ALLOW_CHECKPOINT_EGRESS` desactivado salvo consentimiento separado, verificar con datos sintéticos `provider_route` y `method`, y distinguir una prueba simulada de una solicitud autenticada real. No SHALL solicitar ni imprimir claves en la conversación ni incorporarlas al repositorio o al manifiesto del plugin.

#### Scenario: Instalación nueva con OpenRouter
- **WHEN** se configura una instalación nueva sin `JEV_PROVIDER`
- **THEN** la guía SHALL pedir únicamente `OPENROUTER_API_KEY` para habilitar ranking Jev remoto y SHALL describir la Decisions API como ruta usada

#### Scenario: Migración desde TypeSafe predeterminado
- **WHEN** una instalación anterior tiene `TYPESAFE_API_KEY` y omite `JEV_PROVIDER`
- **THEN** la guía SHALL advertir que al actualizar quedará en fallback local hasta configurar OpenRouter o fijar explícitamente `JEV_PROVIDER=typesafe`

#### Scenario: Vercel permanece seleccionable
- **WHEN** el usuario fija `JEV_PROVIDER=vercel`
- **THEN** la guía SHALL conservar los pasos de `AI_GATEWAY_API_KEY` y SHALL no requerir una clave OpenRouter o TypeSafe directa

#### Scenario: Varias claves presentes
- **WHEN** existen las tres credenciales durante una prueba con datos sintéticos
- **THEN** la guía SHALL exigir comprobar que `provider_route` indica la ruta seleccionada, `method: jev` sólo indica éxito remoto real y ninguna solicitud alcanza las otras rutas

#### Scenario: Credencial ausente o acceso remoto denegado
- **WHEN** la clave seleccionada falta o el proveedor devuelve un rechazo como HTTP 403
- **THEN** la guía SHALL describir el resultado como `local_fallback`, sin afirmar que Jev remoto está operativo y sin recomendar una conmutación automática de proveedor

#### Scenario: Checkpoint sin consentimiento remoto
- **WHEN** hay una credencial remota pero `JEV_ALLOW_CHECKPOINT_EGRESS` no vale `true`
- **THEN** la guía SHALL indicar que los checkpoints permanecen locales en el MCP y los hooks
