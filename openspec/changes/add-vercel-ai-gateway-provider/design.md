# Design

## Context

Ver [proposal.md](proposal.md). Hoy `src/jev.ts` envía directamente `systemone` a TypeSafe, valida `answers.*.noul` y reemplaza un ranking remoto fallido por ranking léxico de todos los candidatos. `src/index.ts` y `src/hooks.ts` crean el cliente por separado; ambos leen `TYPESAFE_API_KEY` y `JEV_MODEL`. El MCP corre localmente por stdio y el envío de extractos conversacionales requiere el permiso adicional `JEV_ALLOW_CHECKPOINT_EGRESS`.

La [API TypeSafe-compatible de Vercel](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) acepta el mismo contrato en `https://ai-gateway.vercel.sh/typesafe/v1/systemone`, autentica con una [clave de AI Gateway](https://vercel.com/docs/ai-gateway/authentication-and-byok) y publica Jev como `typesafe-ai/jev`. El modelo sigue servido por TypeSafe, según la [ficha del modelo](https://vercel.com/ai-gateway/models/jev). No se ha probado una solicitud autenticada desde este repositorio; la propuesta se apoya en el contrato publicado.

## Goals / Non-Goals

**Goals:**

- Resolver una sola ruta remota por proceso y exponerla en los resultados sin alterar el significado de `method`.
- Reutilizar las protecciones actuales de límites, timeout, validación de respuesta, privacidad de checkpoints y fallback local.
- Permitir verificar ambas rutas sin claves reales mediante respuestas simuladas, y distinguir esa prueba de una verificación en vivo.

**Non-Goals:**

- Alojar el MCP en Vercel, usar una función serverless o sustituir Jev por otro modelo.
- Usar la API general `/v1/evaluate`, instalar AI SDK o admitir URLs arbitrarias configuradas por el usuario.
- Cambiar automáticamente de TypeSafe directo a Vercel, o viceversa, ante errores.

## Decisions

### 1. Reutilizar el contrato TypeSafe-compatible

La ruta Vercel usará `POST https://ai-gateway.vercel.sh/typesafe/v1/systemone`, bearer `AI_GATEWAY_API_KEY`, `model: typesafe-ai/jev` y las preguntas `noul` actuales. La ruta directa conservará `POST https://api.typesafe.ai/v1/systemone`, bearer `TYPESAFE_API_KEY` y el modelo `JEV_MODEL` o `jev-latest`. La respuesta pasará por la validación existente y seguirá ignorando metadatos adicionales. Esto evita adaptar `noul` a `boolean` y sumar una dependencia de AI SDK. La alternativa `/v1/evaluate` requeriría otro esquema de solicitud y respuesta sin aportar una capacidad necesaria para estas herramientas.

### 2. Resolver configuración una vez por entorno

Una función compartida interpretará `JEV_PROVIDER`: ausente o `typesafe` selecciona la ruta existente, `vercel` selecciona AI Gateway, y cualquier otro valor es un error de configuración. El MCP rechazará el valor inválido antes de aceptar llamadas; el hook, que debe permitir continuar la compactación, omitirá cualquier llamada remota y mantendrá su comportamiento tolerante a fallos. La configuración resuelta contendrá únicamente la clave de la ruta seleccionada, su URL fija y su modelo. `JEV_MODEL` no alterará la ruta Vercel. Esto mantiene instalaciones anteriores y evita que la presencia de dos claves provoque una selección implícita.

### 3. Conservar un solo destino por operación

El cliente HTTP usará una única configuración resuelta para todos los lotes de un ranking. Si falta la clave seleccionada o falla cualquier lote, descartará todas las puntuaciones remotas y clasificará localmente el conjunto completo. No realizará solicitudes a la otra ruta. El límite de 28.000 bytes, hasta cuatro candidatos por lote, redirecciones rechazadas y timeout actual se aplicarán a ambas. La alternativa de conmutación automática podría enviar el mismo código, log o conversación a un servicio adicional sin una elección del usuario.

### 4. Hacer visible la ruta sin confundirla con el método

Las cuatro herramientas añadirán `provider_route: typesafe|vercel` a sus resultados. Este campo representa la ruta configurada; `method: jev` indica un ranking remoto válido y `method: local_fallback` indica ranking léxico, incluso cuando `provider_route` señala una ruta remota. `api_requests` sigue contando las solicitudes intentadas. Las razones de fallback nombrarán sólo la ruta o clase de error, nunca claves, cuerpos remotos ni extractos enviados.

### 5. Mantener consentimiento separado para contenido conversacional

La selección de ruta y su clave habilitan sólo las operaciones remotas ordinarias. Los checkpoints manuales y automáticos seguirán siendo locales salvo `JEV_ALLOW_CHECKPOINT_EGRESS=true`. Cuando se habilite, los extractos acotados se enviarán únicamente por la ruta seleccionada; Vercel los recibirá y los remitirá a TypeSafe. Se actualizarán README, `docs/INSTALL.md`, `docs/AGENTS.jev.md`, la habilidad incluida y las descripciones MCP para expresar esta frontera. No se supondrá una garantía de retención cero o de no entrenamiento que la ficha de Jev no declara para esta ruta.

## Risks / Trade-offs

- [La ruta Vercel añade otro servicio que recibe datos] → Documentar Vercel y TypeSafe, mantener el filtrado local y el consentimiento adicional para conversación.
- [La API compatible podría variar respecto del servicio directo] → Probar esquema, auth, modelo, errores y lotes con simulaciones de ambos destinos; realizar una prueba en vivo con datos sintéticos sólo cuando exista una clave privada.
- [Una clave presente puede sugerir que esa ruta está activa] → Exigir `JEV_PROVIDER` para Vercel, informar `provider_route` y `method`, y probar el caso con ambas claves.
- [Precios, créditos o cuotas pueden cambiar] → No fijar precios en la documentación; enlazar la ficha y el panel de AI Gateway para consultar condiciones vigentes.

## Migration Plan

Las instalaciones actuales continúan en TypeSafe directo sin cambiar variables. Para usar Vercel en un MCP local se configura `JEV_PROVIDER=vercel` y `AI_GATEWAY_API_KEY` en el entorno que inicia Codex y, para los hooks, en el entorno que los ejecuta; se agregan esos nombres a la configuración que transmite variables al servidor. No hace falta `TYPESAFE_API_KEY` ni un despliegue en Vercel. Después de reiniciar la sesión que corresponda, se verifica con un catálogo sintético que `provider_route=vercel` y, si la clave funciona, `method=jev`. Para volver a la ruta directa se retira el selector o se fija `typesafe` y se usa `TYPESAFE_API_KEY`. En ambas rutas, los checkpoints permanecen locales sin el permiso separado.
