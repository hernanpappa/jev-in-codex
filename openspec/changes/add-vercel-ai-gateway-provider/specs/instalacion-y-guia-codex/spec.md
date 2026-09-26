# Spec Delta

## ADDED Requirements

### Requirement: La instalación permite elegir y verificar una sola ruta de Jev

La guía SHALL documentar `JEV_PROVIDER=typesafe|vercel`, con `typesafe` como valor predeterminado compatible con instalaciones anteriores, y las credenciales privadas `TYPESAFE_API_KEY` y `AI_GATEWAY_API_KEY` para sus respectivas rutas. SHALL explicar que el MCP sigue ejecutándose localmente, que la clave de AI Gateway sirve desde ese entorno sin desplegar el servidor en Vercel ni entregar un token de despliegue, y que sólo la credencial seleccionada se usa aunque ambas estén configuradas. SHALL indicar cómo configurar la misma selección en el MCP y los hooks, reconocer `provider_route` y `method` en una prueba con datos sintéticos, y distinguir la verificación local de una solicitud real autenticada. La guía SHALL mantener `JEV_ALLOW_CHECKPOINT_EGRESS` desactivado por defecto y explicar el tratamiento por Vercel y TypeSafe antes de recomendar su activación.

#### Scenario: Instalación anterior con TypeSafe
- **WHEN** el usuario conserva `TYPESAFE_API_KEY` y no define `JEV_PROVIDER`
- **THEN** la guía SHALL permitir seguir usando la ruta directa y SHALL describir cómo comprobarla sin exigir una clave de Vercel

#### Scenario: Instalación local con AI Gateway
- **WHEN** el usuario elige Vercel para un servidor MCP local
- **THEN** la guía SHALL indicar `JEV_PROVIDER=vercel` y `AI_GATEWAY_API_KEY` como datos necesarios para el ranking remoto, sin solicitar un proyecto desplegado en Vercel ni `TYPESAFE_API_KEY`

#### Scenario: Verificación con ambas claves presentes
- **WHEN** se prueban herramientas con credenciales de ambos servicios en el entorno
- **THEN** la guía SHALL exigir verificar que `provider_route` identifica la única ruta seleccionada y que la otra ruta no recibe solicitudes

#### Scenario: Checkpoint sin consentimiento remoto
- **WHEN** el usuario configura una credencial remota sin `JEV_ALLOW_CHECKPOINT_EGRESS=true`
- **THEN** la guía SHALL indicar que los checkpoints permanecen locales en el MCP y los hooks
