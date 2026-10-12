# Cierre Meetings Notifications — PR #101
2026-10-12. Estado: preparado y probado, NO cerrado. Arquitectura LILLY/ANNIE sigue solo documentación.

## Implementación preparada
- Outbox por evento+correo normalizado, payload de primera escritura inmutable y status accepted duradero.
- SQL de revisión fuera de supabase/migrations: docs/sql/meetings-notification-outbox.review.sql. No se aplica automáticamente ni se tocó Supabase.
- Creación se captura al registrar meeting_created tras guardar convocatoria; creador y convocados completos, sin filtro de asistencia.
- Triggers deferred capturan fecha/hora/lugar/título/convocados; excluyen attendance/status. Snapshot final por transacción evita mensajes intermedios. La instalación no envía histórico; watermark admite cambios futuros de Meetings antiguas.
- El CRUD actual de creación usa varias transacciones: un fallo en el marcador meeting_created requiere revisión/reintento; no se infiere convocatoria completa de una Meeting parcial. No se refactoriza business CRUD contra un esquema no inspeccionado.
- Hint inmediato desde historia + cron preparado cada cinco minutos. Hint fallido no revierte negocio; worker drena outbox ya confirmada.
- Acta: API actual mantiene auth, RLS, owner/finalización y Task ID exacto; creador, convocados asistentes/ausentes, responsables múltiples incluidos. Todo pasa por la misma outbox.
- Clave canónica de acta excluye generatedAt. Primera copia PDF/mensaje permanece inmutable. Retry parcial solo envía pendientes.
- Tasks usa su dispatcher/outbox existente, sin segundo productor. ID ausente queda incierto para conciliación.
- FOR UPDATE SKIP LOCKED + claim token; accepted no se reclama después de 24h. Cinco intentos con backoff solo para 429/5xx explícitos.
- Transporte incierto/ID ausente/claim abandonado/retry fuera de ventana quedan unknown, nunca replay ciego.
- Intentos registran aceptación/error/provider ID y logs estructurados. accepted != delivered; UI distingue cola y aceptación.
- Nuevas tablas con RLS y ACL sin grants a usuarios; RPCs de escritura solo service_role. API flush valida sesión/módulo/perfil activo/owner y no admite payload/destinatarios del navegador.

## Evidencia local
Suite completa: 419 archivos / 1775 tests PASS; después se añadieron nueve tests de endpoint y los 43 tests específicos PASS.
Typecheck/lint/build PASS; warnings existentes de BillingCalendar, sin modificar ese módulo.
Contrato SQL: 30 checks sobre PostgreSQL/WASM efímero (PGlite 0.3.14), incluyendo ausencia de backfill, legacy update, participantes, replay >25h, claims disjuntos, partial retry, stale claim, dead-letter, unknown y ACL. No PostgreSQL Production ni correos externos.
Fixtures y claves locales son sintéticos. Diana, estados/responsables/timestamps históricos no se consultan ni modifican.

## QA real: bloqueada antes de enviar
scripts/qa/meeting-mail-live.mjs exige:
- MEETINGS_QA_RESEND_API_KEY de QA con envío y consulta del estado, configurada como secreto; nunca en chat.
- MEETINGS_QA_RECIPIENTS: cuatro buzones/aliases controlados verificados (creador/asistente/ausente/responsable no convocado).
- MEETINGS_QA_ENABLE_LIVE=true y PGLITE_MODULE aislado.
Runner live ejecutado sin esas credenciales/destinatarios: BLOCKED, salida 2, cero envíos.
Workflow Meetings Notifications QA: SQL en PR; provider real solo por workflow_dispatch y entorno meetings-controlled-qa. No se ejecutó el envío real.
La prueba preparada envía 10 mensajes necesarios (3 creación, 3 cambio, 4 acta), verifica no reenvío al drenar y consulta delivered por provider ID. Sin acceso Supabase. Evidence con hashes de direcciones.
Task assignment/reassignment con dispatcher global aún requiere QA real aislada; la suite local confirma contratos y provider-ID guard.

## Gates antes de marcar ready/cerrado
1. Entrega QA real, incluida notificación Task, con credencial y destinatarios verificados.
2. Revisar contrato SQL frente al esquema Meetings real y autorizar instalación en entorno QA; ninguna migración Production en esta fase.
3. Confirmar retirada del segundo productor del Meet antiguo: repo antiguo no fue accesible (404); no certificar ese punto.
4. Configuración y pruebas operativas de sender/cron/logs/reconciliación.
Invitados externos solo-nombre no tienen dirección verificable; omisión explícita, sin email adivinado.
Referencia de límite del proveedor: https://resend.com/changelog/idempotency-keys. La deduplicación permanente de accepted pertenece a LILLY, no al cache del proveedor.

No merge, deploy, DNS, redirect ni envíos a usuarios reales. PR permanece borrador.

