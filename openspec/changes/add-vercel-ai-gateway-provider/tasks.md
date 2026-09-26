# Tasks

## 1. Selección y cliente remoto

- [x] 1.1 Incorporar una resolución compartida de `JEV_PROVIDER` para MCP y hooks, con TypeSafe como valor predeterminado y error de inicio seguro ante un valor inválido; verificar con pruebas de configuración que el hook sigue tolerando fallos y no hace llamadas remotas en ese caso.
- [x] 1.2 Adaptar el cliente `systemone` para usar exclusivamente la URL, la credencial y el modelo de la ruta seleccionada (`TYPESAFE_API_KEY`/`JEV_MODEL` o `AI_GATEWAY_API_KEY`/`typesafe-ai/jev`); verificar con solicitudes simuladas la URL, el bearer, el cuerpo y la ausencia de llamadas al otro proveedor aun con ambas claves presentes.
- [x] 1.3 Conservar en ambas rutas lotes de hasta cuatro candidatos, límite de 28.000 bytes, timeout de ocho segundos, rechazo de redirecciones, validación `noul` y ausencia de reintentos; verificar con pruebas de límites, respuestas válidas e inválidas y errores de red.
- [x] 1.4 Mantener fallback léxico integral si falta la clave elegida o falla cualquier lote, sin conmutación remota y sin divulgar errores sensibles; verificar con pruebas de fallo en el primer y en un lote posterior, incluyendo el caso Vercel sin clave pero con clave TypeSafe disponible.

## 2. Resultados y privacidad

- [x] 2.1 Exponer `provider_route` en las cuatro herramientas y conservar `method`, `score_kind`, modelo efectivo y `api_requests` con sus significados actuales; verificar con pruebas de resultado remoto y fallback para cada ruta.
- [x] 2.2 Mantener checkpoints manuales y hooks locales por defecto y aplicar `JEV_ALLOW_CHECKPOINT_EGRESS=true` sólo a la ruta elegida; verificar con pruebas de red simulada que los pasajes conversacionales no salen sin consentimiento y que nunca se envían a ambos destinos.
- [x] 2.3 Conservar el tratamiento de evidencia recuperada como dato no confiable y el acceso de solo lectura; verificar con pruebas existentes y revisión de las descripciones de las herramientas que ningún texto recuperado habilita acciones adicionales.

## 3. Instalación y documentación

- [x] 3.1 Actualizar README, `docs/INSTALL.md`, `docs/AGENTS.jev.md`, la habilidad incluida y las descripciones MCP para explicar selector, claves, entornos MCP/hooks, verificación y vuelta a TypeSafe; verificar que los ejemplos de configuración permiten instalar cualquiera de las rutas sin requerir las dos claves ni un despliegue en Vercel.
- [x] 3.2 Documentar el flujo de datos TypeSafe directo frente a Vercel AI Gateway → TypeSafe, el opt-in separado para conversación, el riesgo de secretos dentro de archivos ordinarios y la distinción entre prueba simulada y autenticada; verificar mediante revisión de documentación que no se prometen retención cero, ausencia de entrenamiento ni precios fijos.

## 4. Validación integral

- [x] 4.1 Ejecutar pruebas unitarias y de integración simuladas para las cuatro herramientas con ambos proveedores, selector inválido, ambas claves presentes y fallback local; verificar que la suite completa y la compilación pasan sin credenciales reales.
- [x] 4.2 Si existe una clave privada de AI Gateway disponible en el entorno de pruebas, ejecutar una solicitud mínima con datos sintéticos y verificar `provider_route=vercel` y `method=jev`; si no existe, registrar explícitamente que la verificación en vivo queda pendiente sin solicitar ni registrar la clave en el repositorio.

## Verificación en vivo

El 25-09-2026 no había `AI_GATEWAY_API_KEY` en el entorno de pruebas. La solicitud
autenticada a Vercel AI Gateway queda pendiente; sólo se verificaron respuestas
simuladas con datos sintéticos. No se solicitó, mostró ni guardó ninguna clave.
