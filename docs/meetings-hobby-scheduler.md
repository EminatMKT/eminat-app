# Meetings Notifications: scheduler compatible con Vercel Hobby

## Problema y decisión

Vercel rechazó la creación del deployment 3fa07ea porque el cron de Meetings `*/5 * * * *` supera el límite diario de Hobby. El mínimo diario no es suficiente: el outbox reintenta con backoff en minutos y suspende retries tras 23 horas para proteger la ventana de idempotencia del proveedor. Una ejecución diaria puede consumir esa ventana sin reintento útil.

Se retira únicamente `/api/meetings/notifications/process` de `vercel.json`. El cron Tasks diario y `git.deploymentEnabled` permanecen idénticos. GitHub Actions dispara el mismo GET autenticado de LILLY cada cinco minutos, a minutos 2, 7, 12…57 UTC. GitHub schedule puede retrasarse o perder ejecuciones; no garantiza puntualidad. No se copia el worker a GitHub ni se accede a Supabase o Resend desde el runner.

Documentación oficial: [Vercel Hobby: cron diario](https://vercel.com/docs/cron-jobs/usage-and-pricing), [GitHub schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Control de ejecución

- Grupo de concurrency fijo para producción, `cancel-in-progress: false`: schedule y dispatch manual no se solapan. PR ejecuta solo tests, sin secretos ni endpoint real.
- Una petición GET por tick, timeout 55 segundos, sin redirects ni reintentos HTTP. Un resultado ambiguo vuelve al mecanismo de outbox existente, nunca a un envío directo del runner.
- Se conserva el mismo código `processMeetingMail` + `reconcileMeetingNotifications`. Claims SQL atómicos, claim tokens, dedupe, backoff, provider IDs y logs no cambian. Las llamadas inmediatas existentes desde UI también quedan protegidas por los mismos claims; este cambio no serializa peticiones de UI ni pretende eliminar esas llamadas.
- Respuesta incompleta, worker deshabilitado, conciliación deshabilitada o error HTTP falla el job. Logs del runner muestran solo estado y conteos, sin body, destinatarios, PDF, secrets ni IDs del proveedor. El detalle de provider IDs sigue en LILLY.

## Activación posterior al review/deploy

Este PR no activa nada ni despliega. El tick queda bloqueado por defecto hasta `MEETINGS_SCHEDULER_ENABLED=true` (repository variable). Antes de habilitarlo:

1. Confirmar `CRON_SECRET` existente en Vercel Production y binding del mismo valor como repository secret `CRON_SECRET` de este repo, por mecanismo seguro. No crear/rotar una credencial, no copiar su valor a logs/chat. La existencia y coincidencia del binding GitHub NO están verificadas por el conector; esto es un gate operativo pendiente.
2. Confirmar configuración existente del worker/reconciliación de LILLY (`MEETINGS_MAIL_MODE`, `MEETINGS_MAIL_RECONCILE`) y controles QA/productor canónico. No se cambian en este PR.
3. Tras merge autorizado, desplegar manualmente la versión sin cron Meetings de Vercel. Confirmar que no queda el cron anterior ni un scheduler standalone activo para este mismo flujo. La ausencia global de productores externos todavía requiere verificación operativa; aquí se evita la duplicación de los dos schedulers del repo.
4. Habilitar la variable y ejecutar un único dispatch controlado en main; verificar logs LILLY y Actions. No se ha ejecutado este paso ni se han enviado emails.

## Rollback

Primero establecer `MEETINGS_SCHEDULER_ENABLED=false` y esperar a que termine el tick activo (máximo dos minutos de job). Luego restaurar el deployment previo disponible. No restaurar el cron de cinco minutos bajo Hobby: el mismo rechazo reaparecería. No se necesita rollback SQL, no se borran ni reinician outbox/claims/dedupe/provider IDs. Nunca habilitar dos schedulers a la vez.

## Validación

`node --test scripts/qa/meetings-scheduler.checks.mjs`: siete pruebas sin red real: gate, credencial faltante, endpoint/autorización/redirects, logs sin datos sensibles, HTTP error sin retry, transporte ambiguo sin resend, conciliación incompleta, cron único y configuración Tasks/auto-deploy intacta. Se ejecuta también en el PR mediante `scheduler-contract`.

Las suites PostgreSQL aisladas de outbox, conciliación y migración se conservan. No se cambia el schema ni la lógica de negocio. La entrega real QA continúa pendiente separada.
