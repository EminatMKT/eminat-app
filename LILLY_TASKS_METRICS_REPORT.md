# LILLY — Tasks Email y Metrics

Fecha: 2026-10-03. Rama: `feature/lilly-tasks-metrics`; base verificada: `5973546cf962e0a336fdd971fcb70792d33d56a3`.

## A. Current Production State

- **OBSERVED** — La rama partió del `origin/main` confirmado por el usuario. No se consultó ni modificó el despliegue Production durante esta implementación.
- **OBSERVED** — Repositorio `EminatMKT/eminat-app`; Next.js 14.2.3, React 18, TypeScript, Supabase, Resend, pnpm, Vitest y Playwright. `vercel.json` desactiva despliegues Git para ramas distintas de `main`.

## B. Editability

- **VERIFIED** — Checkout real `/Users/freddyaleexander/Developer/eminat-app`, rama `feature/lilly-tasks-metrics`, HEAD inicial `5973546`, árbol inicial limpio. Build y tests locales ejecutados.

## C. Branch / Preview

- **IMPLEMENTED** — Código en la rama indicada; sin merge a `main`.
- **BLOCKED** — Preview remoto pendiente. Requiere aplicar migraciones a una base Supabase **no Production** y configurar variables Preview antes de desplegar. El despliegue automático de ramas está desactivado; usar Vercel CLI manualmente.

## D. Tasks Current Architecture

- **OBSERVED** — `actividades` tiene un único `responsable_id`. El formulario de Tasks usaba escrituras Supabase desde React. `notificaciones` ya servía avisos internos; Resend ya estaba presente para otros correos.
- **IMPLEMENTED** — El formulario de alta/edición ahora llama a `/api/tasks/save`, que exige sesión y permiso Tasks, valida al responsable activo con acceso Tasks, conserva el control optimista de edición y usa `assignment_request_id` único para evitar crear dos tareas si se repite una solicitud.

## E. Email Notifications Implemented

- **IMPLEMENTED** — El trigger SQL registra un evento de email al crear una tarea asignada o al cambiar `responsable_id`; no registra eventos por una edición con el mismo responsable. El evento se crea dentro de la transacción de la tarea. Las notificaciones internas existentes se generan en ese mismo trigger, una vez por asignación y salvo autoasignación del usuario de la sesión.
- **IMPLEMENTED** — Servicio servidor `dispatchTaskAssignmentEmails`: reclama eventos pendientes con cambio condicional de estado, busca el correo en `usuarios` y envía con Resend. El mismo servicio se llama desde Tasks y la integración Meet. Registra `pending`, `sending`, `sent` o `failed`, identificador de Resend, fecha y error. Los estados inciertos no se reenvían automáticamente para impedir duplicados.
- **IMPLEMENTED** — Email genérico de LILLY con enlace a `/tasks`. Se omiten título y descripción porque esos campos libres podrían contener PHI. No existe deep link estable a una tarea concreta.

## F. Notification Tests

- **VERIFIED (unitario)** — Sin permiso, sin responsable, creación, replay, actualización, conflicto, claim duplicado, falta de configuración de Resend, email ausente, fallo del proveedor y contenido genérico. Resend se simuló; ningún test envió email real.
- **BLOCKED (integración)** — Trigger, transacción y entrega real pendientes de validación en Supabase/Vercel Preview.

## G. Metrics Data Model

- **OBSERVED** — `actividades` aporta `created_at`, `estado`, `fecha_entrega`, `empresa` y `responsable_id`. `usuarios` aporta equipo; `equipos` aporta departamento. El esquema revisado no aporta `completed_at` fiable.
- **IMPLEMENTED** — La función SQL `lilly_task_metrics` agrega en servidor y devuelve sólo resúmenes: Overview, Users, Teams, Companies y tendencia diaria. El navegador no descarga filas de Tasks para calcular KPIs.

## H. Metrics Definitions

- **IMPLEMENTED** — Período: `created_at` de la tarea, usando días de `America/Guayaquil`. Total: tareas creadas en el período y filtros. Completadas: tareas del conjunto cuyo estado actual es `Completado`. Pendientes: estados distintos de `Completado` y `Cancelado` (incluye `Rechazado`). Vencidas: pendientes con `fecha_entrega` anterior al día actual en Guayaquil. Completion rate: `100 × completadas / total`, cero si total es cero. Tendencia: tareas creadas por día y cuántas de ellas están completadas ahora.
- **NOT AVAILABLE YET** — Tiempo promedio de resolución y fecha histórica de completitud: falta `completed_at`. Una migración futura mínima puede agregarlo y mantenerlo al cambiar el estado, después de confirmar la semántica del negocio.
- **OBSERVED** — Users y Teams se atribuyen al responsable y equipo **actuales**; la aplicación no conserva historial de pertenencia a equipo.

## I. Metrics UI

- **IMPLEMENTED** — Un único módulo `Metrics` en la navegación. Dentro hay Overview, Users, Teams y Companies; tarjetas KPI, carga por equipo, tendencia diaria y tablas. Filtros de fecha, empresa, usuario, equipo, departamento y estado. Presets: 7 días, 30 días y mes actual. No hay filtro de prioridad porque `actividades` no tiene ese campo.

## J. Authorization

- **IMPLEMENTED** — Acceso inicial sólo para `admin`: gate del módulo en UI, `requireAdmin()` en API y comprobación `is_admin()` dentro de la función SQL. Los resultados se entregan con `Cache-Control: private, no-store`. Otros roles podrían autorizarse en una iteración posterior con una política explícita de extremo a extremo.

## K. Tests

- **VERIFIED** — `pnpm typecheck`; `pnpm test`; `pnpm build:check` con valores sintéticos no Productivos para las variables obligatorias. El build sin esas variables falla en páginas existentes durante recolección de datos, antes de poder verificar el artefacto completo. Hay advertencias ESLint preexistentes en BillingCalendar.
- **BLOCKED** — No se ejecutó prueba SQL con fixtures contra Supabase Preview ni prueba end-to-end de UI porque no hay base Preview vinculada en este checkout.

## L. Database Changes

- **IMPLEMENTED (migraciones preparadas, no aplicadas)** — `20261003120000_lilly_tasks_metrics.sql`: `assignment_request_id`, outbox y trigger de avisos. `20261003120001_lilly_metrics_aggregate.sql`: función de agregación con guard de admin. Ambas requieren revisión y aplicación en una base segura antes del Preview.
- **VERIFIED** — No se aplicó ninguna migración a Supabase Production.

## M. Deployment Status

- **BLOCKED** — Código local funcional y compilado; sin Preview desplegado ni verificación de integración. Production intacta.

## N. Risks

- **OBSERVED** — Vercel tiene desactivado el despliegue Git para esta rama. Preview debe apuntar a una base Supabase separada y a su propia clave Resend de pruebas; si usa Production, las pruebas modificarían datos reales.
- **OBSERVED** — Un evento `sending` con respuesta incierta del proveedor necesita conciliación manual. Un evento `failed` no se reintenta automáticamente. Las tareas creadas por otros escritores directos de `actividades` quedan en outbox hasta que un servidor invoque el despachador; Tasks y Meet ya lo hacen.
- **OBSERVED** — La capa SQL se validó por revisión y build, no contra una base en ejecución; sus resultados no deben marcarse VERIFIED hasta probar la migración en Preview.

## O. Remaining Work

1. Preparar Supabase Preview aislado y aplicar allí las dos migraciones. Configurar las variables Preview por nombre: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_ENV=local`; usar destinatarios de prueba.
2. Publicar la rama y vincular este checkout al proyecto Vercel existente. Con el proyecto vinculado y variables Preview seguras: `npx vercel deploy --target=preview`. La configuración Git actual no crea Preview por un simple push.
3. Verificar con datos sintéticos en Preview: alta, reasignación, replay, email, aviso interno, KPIs, filtros, autorización y cero datos. Detenerse antes de merge o Production.
