# Proposal

## Why

Hoy Jev sólo puede evaluarse con una clave de TypeSafe. Vercel AI Gateway ya ofrece el mismo modelo mediante una API compatible con TypeSafe, lo que permite usar una clave y facturación de Vercel sin perder la conexión directa existente.

## What Changes

- Incorporar `JEV_PROVIDER=typesafe|vercel` como selección explícita del destino remoto; la ausencia de la variable conserva TypeSafe como valor predeterminado. Una operación usa sólo el destino elegido, aunque ambas claves estén disponibles, y nunca cambia al otro destino tras un fallo.
- Para Vercel, usar `AI_GATEWAY_API_KEY`, el endpoint TypeSafe-compatible de AI Gateway y el modelo `typesafe-ai/jev`; conservar `TYPESAFE_API_KEY`, el endpoint y el modelo actuales para la ruta directa. Mantener el contrato observable de las cuatro herramientas y señalar el destino configurado junto al método `jev` o `local_fallback`.
- Mantener el ranking local como respuesta a falta de la clave seleccionada o errores remotos. El permiso separado `JEV_ALLOW_CHECKPOINT_EGRESS` sigue siendo necesario para enviar contenido conversacional por cualquiera de las dos rutas.
- Actualizar la instalación, las instrucciones de uso y las pruebas para que el usuario conozca qué credencial necesita, qué servicio recibirá sus datos y cómo verificar la ruta activa.
- Aclarar que Vercel autentica, enruta y factura la llamada, pero Jev sigue siendo un modelo de TypeSafe: la ruta Vercel no evita el procesamiento por TypeSafe.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `jev-y-fallback-local`: selección exclusiva entre los dos destinos remotos, credenciales y modelos por ruta, metadatos observables y fallback local sin conmutación remota.
- `proteccion-workspace-y-datos`: divulgación de objetivos y extractos a Vercel y TypeSafe según la ruta elegida, y consentimiento separado para checkpoints con ambas rutas.
- `instalacion-y-guia-codex`: configuración privada y verificación de ambas rutas desde el MCP local y los hooks del plugin.

## Impact

Se modificarán el cliente HTTP de Jev, la configuración compartida por servidor MCP y hooks, las descripciones de herramientas, la documentación y las pruebas. La integración seguirá siendo un proceso MCP local por stdio; no requiere desplegar el servidor en Vercel ni agregar un SDK de Vercel. Se añadirá una dependencia operativa opcional de Vercel AI Gateway para quienes seleccionen esa ruta.
