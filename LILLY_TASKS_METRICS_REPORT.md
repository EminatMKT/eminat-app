# LILLY — Tasks, email y Dashboard administrativo

Fecha: 2026-10-03. Rama: `feature/lilly-tasks-metrics`. Esta revisión reemplaza el diseño del módulo global Metrics: **no existe `/metrics` ni un ítem global Metrics**.

## A. Current Production State

- **OBSERVED** — La rama partió de `origin/main` en `5973546`. No se modificó `main`, Production, GINA ni Medical.

## B. Editability

- **VERIFIED** — Los cambios están en `/Users/freddyaleexander/Developer/eminat-app`, rama `feature/lilly-tasks-metrics`.

## C. Branch / Preview

- **OBSERVED** — El proyecto Preview Supabase indicado para este trabajo es `lilly-tasks-metrics-preview`. Ninguna migración se aplicó a Production durante este trabajo.
- **BLOCKED** — Falta ejecutar la validación de la base y de la interfaz contra Preview. `vercel.json` desactiva despliegues Git de ramas diferentes de `main`, por lo que Preview requiere un despliegue manual seguro.

## D. Tasks Current Architecture

- **OBSERVED** — `actividades` tiene un responsable único. El sistema reutiliza el rol existente `admin` como Super Admin: `normalizeRole('superadmin')` y `normalizeRole('coordinador')` resuelven a `admin`; `esAdmin` y `requireAdmin()` siguen ese mismo criterio.
- **IMPLEMENTED** — Production y Requests siguen disponibles para trabajadores. La pestaña Dashboard se omite del sidebar y del catálogo permitido para trabajadores; un valor de preferencia guardado como `overview` cae a Production. El componente Dashboard también tiene guard visual. Su API `/api/tasks/dashboard` exige `requireAdmin()` y la función SQL agregada exige `is_admin()`.

## E. Email Notifications Implemented

- **IMPLEMENTED** — Se conservan la ruta de guardado de Tasks, el outbox, el trigger de asignación, Resend en servidor y la notificación interna. El mismo despachador cubre asignaciones desde Tasks y Meet. El email evita campos libres que podrían contener PHI.

## F. Notification Tests

- **VERIFIED** — Pruebas sintéticas de permisos, creación, replay, reasignación, conflicto, email ausente, fallo del proveedor y prevención de claims duplicados. No se envían correos reales.

## G. Metrics Data Model

- **IMPLEMENTED** — La función `lilly_task_metrics` sigue siendo infraestructura interna, ahora consumida sólo por Tasks → Dashboard. Devuelve agregados de Overview, usuarios, equipos, departamentos, empresas y tendencia; nunca filas de Tasks al navegador por esta API.
- **OBSERVED** — No existe `completed_at` fiable; el tiempo promedio de resolución continúa **NOT AVAILABLE YET**.

## H. Metrics Definitions

- **IMPLEMENTED** — Período por `created_at` en `America/Guayaquil`; completadas por estado actual `Completado`; pendientes por estados distintos de `Completado` y `Cancelado`; vencidas por fecha de entrega anterior a hoy y estado pendiente; completion rate = `100 × completadas / total`, o cero si el total es cero. Usuarios y equipos se atribuyen a la asignación y estructura actuales.

## I. Tasks UI

- **IMPLEMENTED** — Dashboard es el único centro global de rendimiento y sólo Super Admin puede abrirlo. Conserva indicadores, horas, días de producción, rankings, gráficos, actividad reciente, Gantt y resumen del equipo. Añade vencidas, carga por usuario/equipo/empresa y tendencia mediante agregados de servidor, sin duplicar las tarjetas ya existentes de total/completadas/pendientes/completion rate.
- **IMPLEMENTED** — Report del trabajador muestra sólo tareas asignadas al usuario autenticado, empresa/área y estado. No monta selector de trabajadores, impresión de pago, horas, días de producción, productividad ni rankings. Report de Super Admin conserva el informe completo actual.

## J. Authorization

- **IMPLEMENTED** — `/api/tasks/dashboard` verifica Super Admin en API y SQL. `/api/tasks/report` exige permiso Tasks; rechaza el parámetro `user` ajeno para trabajadores, filtra por el `id` del perfil autenticado y selecciona únicamente columnas operacionales. Para admin permite seleccionar usuario y columnas completas. Ambas rutas responden con `Cache-Control: private, no-store`.
- **OBSERVED** — Production y Requests continúan usando la lista general de Tasks conforme a la arquitectura vigente. La nueva restricción de Report se aplica a su endpoint y vista; no sustituye la política general de lectura de `actividades` usada por esas otras pestañas.

## K. Tests

- **VERIFIED** — `pnpm typecheck`, suite Vitest completa y build optimizado con variables sintéticas no Productivas. Tests nuevos cubren visibilidad de pestañas, API de Dashboard, acceso propio/ajeno a Report, columnas permitidas y períodos inválidos.
- **BLOCKED** — No se ejecutó prueba SQL ni E2E contra Supabase/Vercel Preview.

## L. Database Changes

- **IMPLEMENTED (migraciones preparadas)** — El outbox y la función SQL agregada de los commits anteriores permanecen. No se añadió migración para esta reorganización: la función ahora sirve al Dashboard de Tasks. `completed_at` queda como propuesta futura.

## M. Deployment Status

- **BLOCKED** — Código y pruebas locales listos; sin merge, sin despliegue Production y sin verificación Preview en este turno.

## N. Risks

- **OBSERVED** — La consulta SQL y el trigger del outbox necesitan ejecución real con fixtures en `lilly-tasks-metrics-preview`. La semántica de equipo usa la pertenencia actual, no historial. Un evento de email con resultado incierto del proveedor necesita conciliación manual y no se reenvía automáticamente para evitar duplicados.

## O. Remaining Work

1. Aplicar las migraciones anteriores sólo a `lilly-tasks-metrics-preview` y configurar Vercel Preview con esa base y destinatarios de prueba.
2. Validar en Preview con una cuenta trabajadora y una Super Admin: Dashboard, Report propio, rechazo de `user` ajeno, agregados, filtros, avisos internos y email.
3. Detenerse antes de merge o Production.
