# Design

## Context

Ver [proposal.md](proposal.md). El MCP y los hooks resuelven actualmente una de dos rutas en `src/provider.ts`; `src/jev.ts` usa el mismo cuerpo `state`/`questions` y valida `answers.*.noul` para TypeSafe directo y Vercel. El plugin instalado en esta máquina tiene además un launcher local que fija Vercel, independiente del código fuente; cambiar sólo el valor predeterminado del repositorio no cambiará esa instalación. OpenRouter documenta Jev en [Decisions API](https://openrouter.ai/blog/tutorials/how-to-use-jev/), `POST https://openrouter.ai/api/alpha/decisions`, con el alias de modelo [`~typesafe/jev-latest`](https://openrouter.ai/~typesafe/jev-latest). El endpoint de chat de OpenRouter no sirve para este contrato `noul`.

## Goals / Non-Goals

**Goals:**

- Mantener una única decisión de ruta por proceso/operación y reutilizar la validación y límites actuales del ranking.
- Hacer que el valor ausente de `JEV_PROVIDER` signifique OpenRouter sin inferir rutas a partir de las claves presentes.
- Permitir que una instalación actual continúe en TypeSafe o Vercel mediante selección explícita y que la migración sea comprobable con datos sintéticos.

**Non-Goals:**

- Usar `typesafe/jev-router` u otro modelo generativo, la API de chat/completions o un SDK nuevo de OpenRouter.
- Conmutación automática entre proveedores por falta de saldo, HTTP 403, cuota o timeout.
- Activar envío remoto de conversación, modificar el umbral de compactación nativa o desplegar el MCP fuera del equipo.

## Decisions

### 1. Tercera ruta explícita con OpenRouter como valor ausente

Ampliar la resolución compartida de `JEV_PROVIDER` a `openrouter|typesafe|vercel` y usar `openrouter` cuando no exista. La configuración resuelta retendrá sólo la clave de la ruta elegida. OpenRouter usará `OPENROUTER_API_KEY` y el alias fijo `~typesafe/jev-latest`; `JEV_MODEL` seguirá perteneciendo sólo a TypeSafe directo para no aceptar accidentalmente un modelo de chat incompatible. El alias conserva la semántica de Jev más reciente; el campo de respuesta `model` mostrará la versión efectiva. Alternativa descartada: mantener TypeSafe por defecto, porque contradice la preferencia solicitada y deja el flujo principal actual en fallback.

### 2. Adaptar el transporte, no el contrato de ranking

Agregar el endpoint fijo de OpenRouter al cliente HTTP existente. El cuerpo `model`, `state` y `questions` con preguntas `noul`, el bearer token y la respuesta `answers` son compatibles con la Decisions API publicada. Conservar las validaciones actuales de rango 0–1, respuestas por candidato, tamaño, lotes, timeout y redirecciones. La ruta OpenRouter deberá verificarse con un servidor HTTP simulado y después con una solicitud real de texto sintético y una clave proporcionada fuera del chat. Alternativa descartada: introducir `@openrouter/sdk`, porque no agrega capacidad necesaria y amplía la superficie de dependencias.

### 3. Errores locales sin cambio de proveedor

`provider_route` seguirá indicando la ruta configurada, no que hubo éxito remoto. Ante clave ausente, rechazo de cuenta/modelo o cualquier error de respuesta, `method` será `local_fallback`, se descartarán puntajes parciales y no se usará ninguna otra credencial. Se conservará únicamente el código HTTP en diagnósticos seguros. Esto evita que un fallo de saldo en OpenRouter termine divulgando el mismo código o log por Vercel o TypeSafe sin elección del usuario.

### 4. Separar configuración del MCP y los hooks

Documentar `OPENROUTER_API_KEY` en el entorno que inicia el MCP y, sólo si se autoriza `JEV_ALLOW_CHECKPOINT_EGRESS=true`, en el entorno que ejecuta los hooks. El manifiesto y el repositorio guardarán nombres de variables, nunca valores. El launcher local actualmente fija `JEV_PROVIDER=vercel`: la implementación/documentación deberán contemplar su migración explícita a OpenRouter sin sobrescribir claves ni la confianza de hooks. Los checkpoints seguirán siendo locales por defecto aunque exista una clave OpenRouter.

### 5. Reconciliar el historial de specs

La implementación Vercel ya existe en código y en un cambio OpenSpec completado, pero las specs principales aún describen en gran parte TypeSafe directo. Esta propuesta define deltas sobre el comportamiento efectivo de tres rutas. Antes de archivar este cambio, se deberán sincronizar o archivar en orden los requisitos de Vercel y luego los de OpenRouter para no perder los escenarios intermedios.

## Risks / Trade-offs

- [El alias `~typesafe/jev-latest` puede pasar a otra versión] → Validar siempre la forma `noul`, informar el modelo efectivo y usar fallback local si el contrato cambia.
- [La API de OpenRouter puede diferir del servicio directo] → Pruebas de contrato simuladas de endpoint, auth, cuerpo, respuesta y errores, más una prueba autenticada con datos sintéticos antes de declarar la ruta operativa.
- [Cambio de default rompe instalaciones sin selector] → Documentar `JEV_PROVIDER=typesafe` como migración, actualizar ejemplos y probar presencia simultánea de las tres claves.
- [Extractos de código/logs pasan por OpenRouter y TypeSafe] → Mantener límites y exclusiones, advertir que no detectan secretos embebidos y exigir opt-in separado para conversación.
- [El plugin instalado conserva un launcher Vercel] → Verificar la configuración efectiva del plugin/cache y migrar su launcher de forma privada durante la aplicación; una compilación correcta no basta.

## Migration Plan

Primero actualizar código y pruebas sin modificar la instalación activa. Quien quiera conservar TypeSafe o Vercel fijará explícitamente `JEV_PROVIDER=typesafe` o `JEV_PROVIDER=vercel`; quien elija OpenRouter configurará `OPENROUTER_API_KEY` de forma privada y quitará el selector o fijará `JEV_PROVIDER=openrouter`. Después se actualizarán el launcher MCP y el entorno de hooks del plugin local, se reiniciará Codex y se comprobarán las cuatro herramientas, `provider_route`, `method` y los hooks activos/confiables. La prueba remota usará únicamente candidatos sintéticos; el checkpoint deberá permanecer local sin opt-in. Rollback: volver a la versión anterior del plugin y fijar una ruta anterior con su propia clave; no mover ni exponer credenciales a otra ruta automáticamente.
