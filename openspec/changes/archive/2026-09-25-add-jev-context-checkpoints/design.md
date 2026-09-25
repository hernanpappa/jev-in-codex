# Design

## Context

Ver `proposal.md` para la motivación y las cuatro specs de este cambio para el contrato observable. Hoy el servidor MCP ofrece selección, búsqueda y triage; `jev` usa evaluaciones TypeSafe tipadas para ranking y tiene fallback local. Los hooks de Codex reciben eventos previos a compactar y pueden añadir contexto en una sesión iniciada después de la compactación, pero el formato del transcript no es una interfaz estable.

La propuesta se apoya en el ciclo documentado de [hooks de Codex](https://learn.chatgpt.com/docs/hooks) y el transporte stdio MCP documentado para Codex. La API de TypeSafe ofrece evaluaciones tipadas, no generación de texto libre ([API de TypeSafe](https://docs.typesafe.ai/api)); por eso el checkpoint conserva extractos en vez de pedirle a Jev que redacte un resumen.

## Goals / Non-Goals

**Goals:**

- Compartir una misma lógica de selección extractiva entre la herramienta MCP manual y los hooks.
- Leer el transcript sólo cuando Codex invoque el hook previo a compactar, limitar el procesamiento y aislar la dependencia del formato del transcript.
- Reinyectar en la continuación un checkpoint local breve y atribuible a sus mensajes de origen.
- Mantener la compactación nativa de Codex operativa ante cualquier error o ausencia de Jev.
- Evitar el envío remoto de texto conversacional salvo autorización específica para checkpoints.

**Non-Goals:**

- Reemplazar la compactación nativa con un resumen generado por Jev o por otro proveedor.
- Observar el porcentaje interno de contexto de Codex o forzar la compactación al alcanzar un porcentaje o número de mensajes.
- Copiar, indexar o conservar el transcript completo.
- Cambiar las reglas de lectura del workspace de `jev_search` y `jev_triage`.

## Decisions

### Un servicio extractivo compartido, con dos adaptadores

La selección de pasajes vivirá en una función de servicio reutilizable. El handler MCP adaptará la petición manual; un adaptador de hooks adaptará los eventos de ciclo de vida y el transcript a la misma entrada interna. Los hooks llamarán directamente al servicio local: no iniciarán un segundo servidor stdio ni enviarán una llamada MCP entre procesos. Las salidas serán referencias, fragmentos originales, puntuaciones disponibles y avisos de cobertura; Jev no generará prosa de resumen.

Alternativa considerada: agregar sólo instrucciones a la habilidad para que Codex llame manualmente la herramienta. Se descarta como única vía porque no conserva contexto de forma automática ante el evento nativo de compactación.

### Los hooks acompañan el ciclo nativo y fallan abiertos

Registrar un hook `PreCompact` para `trigger=manual` y `trigger=auto`. Si hay transcript utilizable, el hook prepara y guarda el checkpoint antes de la compactación. Registrar `SessionStart` filtrado a `source=compact` para cargar el checkpoint y emitirlo mediante el campo de contexto adicional admitido por Codex. El hook no devolverá una señal para detener la sesión ni alterar la compactación. Si el evento o el checkpoint falla, saldrá sin contenido adicional y dejará continuar a Codex.

Alternativa considerada: implementar el ciclo de compactación desde Jev. Se descarta porque este proceso MCP no controla el contexto ni el historial activo de Codex y la API de TypeSafe no produce una compactación compatible.

### Parser aislado, acotado y tolerante al formato del transcript

El adaptador aceptará únicamente la ruta entregada en el evento de Codex, validará que sea un archivo regular y leerá como máximo el último MiB, sin copiar el archivo completo. Un parser pequeño y versionado reconocerá sólo registros de mensajes admitidos; los registros desconocidos se omitirán y se reflejarán en cobertura. Los límites publicados son 200 mensajes y 120.000 caracteres de entrada, pasajes de hasta 1.000 caracteres, 24 candidatos locales, ocho pasajes devueltos y un máximo de 8.000 caracteres de extractos. Si se autoriza evaluación remota, el hook envía como máximo cuatro candidatos para respetar el timeout previo a compactar.

Alternativa considerada: tratar el JSONL del transcript como API estable o recorrerlo completo. Se descarta porque Codex advierte que ese formato puede cambiar y porque leer todo aumenta exposición, latencia y uso de memoria. Si el formato esperado cambia, el comportamiento seguro es omitir el checkpoint, no inferir contenido.

### Checkpoint local privado, mínimo y efímero

El checkpoint automático se almacenará fuera del repositorio, en el subdirectorio `jev-context-checkpoints` de `PLUGIN_DATA`, separado por proyecto y sesión. Se guardará sólo el identificador de sesión, metadatos mínimos y los pasajes seleccionados; nunca el transcript original. El directorio usa permisos `0700` y los archivos `0600` cuando la plataforma lo permite. Tras una reanudación exitosa el hook eliminará el checkpoint consumido; vence a las 24 horas y la limpieza en siguientes ejecuciones retira restos si la sesión no se reanuda. El contexto reinyectado queda limitado a 9.000 bytes y el hook indica si esa cota obligó a omitir pasajes seleccionados.

Alternativa considerada: persistir en `.jev/` dentro del proyecto. Se descarta porque podría incluirse en Git o ser leído por procesos del proyecto sin una necesidad funcional.

### Sin divulgación remota por defecto para checkpoints

La herramienta manual y los hooks usarán evaluación local para el texto conversacional mientras no esté activada una opción específica de divulgación de checkpoints. La existencia de `TYPESAFE_API_KEY`, usada por otras herramientas, no habilitará esta opción. Si el usuario la habilita, el servicio podrá enviar a TypeSafe sólo el objetivo y los candidatos acotados necesarios para la puntuación `noul`, y deberá informar ese flujo en configuración y documentación. La desactivación mantendrá disponible la selección local y el ciclo de compactación.

Alternativa considerada: heredar automáticamente la configuración remota existente. Se descarta porque el transcript contiene conversación privada y configurar el proveedor para búsquedas del workspace no equivale a autorizar el envío de historial conversacional.

### Umbrales de compactación no configurables por Jev

Los hooks se ejecutan cuando Codex notifica una compactación; un conteo opcional de mensajes podría servir como señal o sugerencia separada, nunca como control de compactación ni medición del porcentaje real. La herramienta `jev_create_checkpoint` permite una solicitud manual sin alterar la conversación.

Alternativa considerada: activar el checkpoint al alcanzar un porcentaje de contexto o forzar compactación tras N mensajes. Se descarta porque los hooks no proporcionan una autoridad fiable para controlar esos umbrales y porque el servidor MCP no puede compactar el contexto del anfitrión.

## Risks / Trade-offs

- **[El formato del transcript cambia] →** mantener el parser pequeño, aislarlo, probar fixtures por versión conocida, ignorar registros desconocidos y fallar sin bloquear la compactación.
- **[Un checkpoint omite una decisión importante] →** incluir puntuaciones/cobertura y referencias de origen; no presentar la ausencia de un pasaje como prueba de que no existía.
- **[La continuación recibe contexto obsoleto] →** asociar el archivo a la sesión y proyecto del evento, consumirlo una vez y expirar/limpiar checkpoints no usados.
- **[El hook agrega latencia previa a compactar] →** imponer cotas estrictas de lectura, segmentación y tiempo; mantener el ranking local por defecto y abandonar sin bloquear ante timeout o falla.
- **[Los extractos contienen secretos o instrucciones hostiles] →** no transmitirlos por defecto, tratarlos como datos no confiables, conservar sólo segmentos seleccionados y mantener fuera del alcance de ejecución.
- **[El almacenamiento local no ofrece los mismos permisos en todos los sistemas] →** usar permisos más restrictivos disponibles, validar dueño/ruta al leer y documentar la protección efectiva por plataforma.

## Migration Plan

1. Añadir la herramienta manual y pruebas sin cambiar el comportamiento de las tres herramientas existentes.
2. Añadir el adaptador y configuración de hooks como integración desactivable; validar el contrato con fixtures locales y sin requerir una clave TypeSafe.
3. Documentar la instalación, la inspección y la reversión de hooks; indicar el almacenamiento y las opciones de divulgación.
4. Habilitar los hooks durante la instalación del proyecto sólo después de mostrar qué eventos y rutas locales usarán. La reversión elimina/desactiva la configuración de hooks y limpia checkpoints vencidos; no modifica transcripts ni historial de Codex.

## Open Questions

No hay decisiones pendientes.
