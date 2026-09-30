# Tasks

## 1. Selección y configuración del proveedor

- [x] 1.1 Incorporar `openrouter` a `JEV_PROVIDER` y establecerlo como valor predeterminado cuando la variable no esté definida, manteniendo `typesafe` y `vercel` como elecciones explícitas. Verificar con pruebas unitarias de selección, valor inválido y ausencia de configuración.
- [x] 1.2 Leer exclusivamente la credencial del proveedor seleccionado (`OPENROUTER_API_KEY`, `TYPESAFE_API_KEY` o la credencial vigente de Vercel), sin alternancia automática entre proveedores. Verificar con pruebas que configuren múltiples claves simultáneamente y comprueben qué ruta se utiliza y cuál no.

## 2. Cliente Jev y manejo de fallos

- [x] 2.1 Integrar el endpoint de Decisions API de OpenRouter con el modelo `~typesafe/jev-latest`, conservando el contrato `state`/`questions` y la lectura de respuestas `noul`. Verificar con una respuesta HTTP simulada que las tres herramientas MCP procesen decisiones válidas.
- [x] 2.2 Conservar límites de tiempo y tamaño, validación de respuestas, protección frente a redirecciones y fallback local ante clave ausente, error HTTP, timeout o respuesta inválida. Verificar con pruebas de cada caso que no se envíe una segunda petición a TypeSafe ni a Vercel.
- [x] 2.3 Confirmar que las rutas explícitas TypeSafe y Vercel mantienen sus endpoints, modelos y formatos existentes. Verificar con pruebas de regresión para los tres proveedores.

## 3. Herramientas MCP y hooks

- [x] 3.1 Actualizar mensajes de ayuda, diagnóstico y metadatos de las herramientas para reflejar el proveedor activo y distinguir Jev remoto del fallback local. Verificar mediante pruebas de las tres herramientas y de los diagnósticos sin credencial.
- [x] 3.2 Mantener los hooks automáticos con procesamiento local por defecto de los checkpoints, incluso cuando OpenRouter sea el proveedor seleccionado; permitir salida remota únicamente con `JEV_ALLOW_CHECKPOINT_EGRESS=true`. Verificar con pruebas que inspeccionen las solicitudes de red con y sin esa autorización.

## 4. Instalación y documentación

- [x] 4.1 Actualizar README, `docs/INSTALL.md`, `docs/AGENTS.jev.md` y la habilidad incluida para documentar OpenRouter como opción predeterminada, las variables de entorno, la exclusividad entre proveedores y el fallback local. Verificar ejemplos y buscar referencias obsoletas al proveedor predeterminado.
- [x] 4.2 Documentar la migración de instalaciones existentes: quienes dependían del TypeSafe implícito deberán establecer `JEV_PROVIDER=typesafe`; un launcher local que fuerce Vercel conservará ese comportamiento hasta actualizarlo explícitamente. Verificar las instrucciones contra las rutas reales de instalación y sin exponer claves.

## 5. Validación integral

- [x] 5.1 Ejecutar chequeos del proyecto y pruebas automatizadas, incluidos escenarios simulados de los tres proveedores, fallback y hooks. Verificar que el conjunto final pase y registrar cualquier limitación.
- [x] 5.2 Si se dispone de una clave privada de OpenRouter durante la implementación, hacer una prueba de extremo a extremo con datos sintéticos y reportar el proveedor efectivo y las tres herramientas; si no, reportar que sólo se verificó mediante simulaciones, sin afirmar conectividad real.
- [x] 5.3 Validar el cambio OpenSpec y revisar la secuencia de sincronización con el cambio previo de Vercel antes de archivar cualquiera de los dos, evitando perder requisitos de proveedor. Verificar el resultado de `openspec validate` y el estado de las specs principales.
