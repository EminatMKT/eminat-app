# Cierre Meetings Notifications — PR #101
2026-10-12. Estado: preparado y probado, NO cerrado. Arquitectura LILLY/ANNIE sigue solo documentación.

Actualización: reutilizar exclusivamente la integración/key existente. Confirmado en Vercel que stratix-meet-app tiene RESEND_API_KEY en Production y eminat-app en Production/Preview; valores ocultos. No se crea una nueva key. Runner prefiere RESEND_API_KEY y admite el nombre antiguo solo como alias del mismo secreto existente. Workflow referencia RESEND_API_KEY del entorno controlado; no se copió ni configuró ningún secreto. La sesión Resend ahora disponible confirma stratixsolutions.us Verified y entregas anteriores de Tasks; no constituyen QA controlada ni verificación de recepción del PDF. Acceso a claves/logs restringido por protección de credenciales. Repo standalone sigue 404 para el connector. Hostinger no permite observar inventario de buzones; Reply-To atendido y cuatro buzones QA aún no identificados. Sin destinatarios QA verificados no hay envío real; no usar usuarios reales como sustituto.

## Conciliación preparada (sin instalar ni activar)
El worker cron protegido incluye lectura de estado Resend por los IDs aceptados de Meetings y Tasks. MEETINGS_MAIL_RECONCILE=true es opt-in; apagado por defecto. Reutiliza la API key existente con permiso de consulta, sin nuevas keys/webhooks. SQL adicional de revisión: docs/sql/meetings-delivery-reconciliation.review.sql; no es migración ni se aplicó a Supabase. Persiste delivered/bounced/failed/complained, evento original y logs deduplicados; polling cada cinco minutos por mensaje durante siete días. Estados terminales no se reenvían; errores de lectura se vuelven a consultar sin crear emails. opened/clicked implican entrega, no lectura humana demostrada. Conserva accepted/sent en la outbox como aceptación y no altera Tasks/Meetings ni sus responsables. No prueba recepción en buzón ni concilia automáticamente resultados inciertos sin ID; estos siguen retenidos para revisión, sin replay ciego. Pruebas: 41 tests enfocados, 15 contratos de conciliación PostgreSQL aislado, typecheck y lint PASS (warnings BillingCalendar preexistentes).

## Productor canónico y retirada standalone
LILLY es el productor designado de nuevas notificaciones. NO se certifica cutover operativo hasta inspeccionar el repositorio/deployment standalone y retirar solo sus envíos delegados, manteniendo rutas/auth/lectura/creación y usando el dispatcher LILLY autorizado. Compartir dominio o sender no deduplica productores. No revocar la key compartida ni apagar Meet: rompería otros correos/auth y no sustituye un cambio de código verificable. PR companion, tests de no doble envío y smoke test standalone son gates pendientes por falta de acceso al repo. Sin cambios en Production.

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
- RESEND_API_KEY existente con envío y consulta del estado, disponible de forma segura para la ejecución aislada; nunca en chat. No generar otra key.
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

