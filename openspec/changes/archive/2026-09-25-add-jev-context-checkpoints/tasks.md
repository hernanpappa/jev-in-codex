# Tasks

## 1. Servicio de selección extractiva

- [x] 1.1 Definir y documentar límites de caracteres, pasajes y bytes de transcript; verificar con pruebas de límites que se rechacen entradas excesivas y nunca se excedan las cuotas de salida.
- [x] 1.2 Implementar el servicio compartido de selección que devuelva pasajes originales con referencia de origen, puntuaciones y cobertura; verificar que no genere prosa y preserve el texto exacto de los extractos.
- [x] 1.3 Añadir el modo local de ranking para contenido conversacional; verificar que no realice llamadas de red aunque `TYPESAFE_API_KEY` esté configurada.
- [x] 1.4 Añadir pruebas de selección sin evidencia suficiente, ranking léxico y cobertura parcial; verificar que la salida advierta omisiones y no invente contenido.

## 2. Herramienta MCP manual

- [x] 2.1 Registrar `jev_create_checkpoint` con esquema, límites y anotaciones de solo lectura; verificar que el handshake anuncie la herramienta junto con las existentes.
- [x] 2.2 Conectar el handler con el servicio extractivo y documentar entradas/salidas; verificar llamadas válidas, entradas vacías/excesivas y errores MCP sin caída del servidor.
- [x] 2.3 Verificar con una prueba de contrato que contenido hostil del historial sólo se devuelve como dato no confiable y no activa comandos ni modifica la sesión.

## 3. Hooks y transcript de Codex

- [x] 3.1 Implementar un adaptador `PreCompact` para `manual` y `auto` que reciba el evento de Codex, valide la referencia del transcript y use el servicio local; verificar ambos disparadores con fixtures.
- [x] 3.2 Implementar un parser aislado para los registros de mensaje admitidos y su ventana acotada; verificar registros válidos, desconocidos, transcript truncado y cambio de formato.
- [x] 3.3 Implementar `SessionStart` filtrado por `source=compact` para entregar el checkpoint como contexto adicional; verificar que no se inyecte en otros inicios y que se consuma sólo el checkpoint de la misma sesión/proyecto.
- [x] 3.4 Asegurar comportamiento fail-open ante evento, archivo, parser, ranking, timeout o almacenamiento inválidos; verificar que los hooks no bloqueen ni cancelen la compactación y permitan continuar sin Jev.

## 4. Privacidad, almacenamiento y TypeSafe

- [x] 4.1 Implementar almacenamiento local privado por proyecto y sesión, con permisos restrictivos, consumo único, vencimiento y limpieza; verificar aislamiento entre sesiones, eliminación tras restaurar y limpieza de checkpoints expirados.
- [x] 4.2 Implementar lectura limitada del transcript entregado por Codex, rechazando rutas arbitrarias del llamante MCP, archivos no regulares, symlinks no admitidos y tamaños/formato fuera de límites; verificar que la lectura no amplíe el acceso de las herramientas de workspace.
- [x] 4.3 Añadir la opción explícita de divulgación remota de checkpoints separada de `TYPESAFE_API_KEY`; verificar con mocks que por defecto no se envíen transcript ni extractos y que, con opt-in, sólo se evalúen candidatos acotados autorizados.
- [x] 4.4 Verificar que deshabilitar la divulgación remota mantenga checkpoint manual, evaluación local y hooks automáticos operativos.

## 5. Instalación y documentación

- [x] 5.1 Añadir la configuración instalable y desactivable de los hooks, con almacenamiento y opción de privacidad; verificarla en una configuración limpia de proyecto y comprobar que no modifica otros hooks existentes.
- [x] 5.2 Actualizar `docs/INSTALL.md` y la guía de uso para explicar instalación, inspección, verificación y desactivación; verificar que describan compactación nativa, privacidad, límites, fallos y divulgación opcional sin afirmar control de porcentaje o umbral.
- [x] 5.3 Actualizar ejemplos/fixtures de documentación; verificar los pasos de verificación local sin requerir API key ni transmitir una conversación real.

## 6. Verificación integrada

- [x] 6.1 Ejecutar las verificaciones disponibles (`npm run check`); verificar que pasan el chequeo de tipos y las suites junto con las pruebas nuevas y que no hay regresiones en las herramientas existentes.
- [x] 6.2 Ejecutar `openspec validate add-jev-context-checkpoints --strict`; verificar que todos los artefactos cumplen esquema, escenarios y referencias antes de iniciar implementación.
