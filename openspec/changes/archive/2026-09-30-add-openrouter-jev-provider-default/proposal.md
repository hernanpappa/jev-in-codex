# Proposal

## Why

La ruta Vercel instalada responde HTTP 403 para Jev en la cuenta actual sin créditos pagos, por lo que las herramientas terminan en fallback local aunque el MCP y los hooks funcionan. El usuario ya dispone de créditos en OpenRouter y quiere usar Jev por esa ruta de forma predeterminada, conservando TypeSafe directo y Vercel como alternativas explícitas.

## What Changes

- Añadir `openrouter` como tercera ruta remota de Jev mediante la Decisions API de OpenRouter, con `OPENROUTER_API_KEY` y un identificador de modelo Jev compatible con preguntas `noul`.
- **BREAKING:** cambiar el valor predeterminado de `JEV_PROVIDER` ausente de `typesafe` a `openrouter`. Las instalaciones anteriores deberán fijar `JEV_PROVIDER=typesafe` para mantener su ruta actual.
- Mantener una sola ruta por operación: si falta la clave elegida o la solicitud falla, usar fallback léxico local sin probar otro proveedor.
- Actualizar la instalación, la habilidad y la guía de privacidad para explicar las tres rutas, las credenciales privadas y la verificación con datos sintéticos. El permiso separado para enviar fragmentos conversacionales continuará desactivado por defecto.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `jev-y-fallback-local`: selección de tres rutas, OpenRouter por defecto, contrato Decisions API, resultados y fallback sin conmutación remota.
- `proteccion-workspace-y-datos`: divulgación de extractos y checkpoints por OpenRouter hacia el proveedor del modelo Jev, con consentimiento separado para conversación.
- `instalacion-y-guia-codex`: instrucciones de selección, migración y verificación de las tres rutas en MCP y hooks.

## Impact

- Código: `src/provider.ts`, `src/jev.ts`, `src/index.ts`, `src/hooks.ts` y sus pruebas de proveedor, MCP, extremo a extremo y hooks.
- Superficie de configuración: `JEV_PROVIDER`, nueva `OPENROUTER_API_KEY`, modelo de OpenRouter y entorno del launcher MCP/hooks; los nombres de las cuatro herramientas MCP no cambian.
- Documentación: `README.md`, `docs/INSTALL.md`, `docs/AGENTS.jev.md`, `skills/jev-assist/SKILL.md` y ejemplos de configuración.
- Dependencia externa: `POST https://openrouter.ai/api/alpha/decisions`; no se necesita desplegar el MCP en OpenRouter ni agregar un SDK si se mantiene el cliente HTTP existente.
