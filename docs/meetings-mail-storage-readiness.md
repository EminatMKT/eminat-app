# Meetings mail storage: preparación y gates

2026-10-12. PR #101 ya mergeado, main 0e45a04134bfcaea3e2be20e5ef4fe4a27d875cb. No deploy, redirect ni SQL ejecutado en Production.

## Qué es enqueue_meeting_mail

RPC PostgreSQL public.enqueue_meeting_mail(p_meeting_id uuid, p_key text, p_kind text, p_payload jsonb, p_recipients jsonb) RETURNS uuid. SECURITY DEFINER con search_path public; EXECUTE solo service_role. No es trigger. Persiste evento/payload inmutable y destinatarios normalizados con unicidad event_key y event_id+email. La API meeting-report la invoca mediante Supabase rpc; capture_meeting_mail también la llama desde los triggers lifecycle. No envía correo por sí misma: el worker usa claim_meeting_mail y finish_meeting_mail con Resend existente.

Original: docs/sql/meetings-notification-outbox.review.sql, SQL de revisión que nunca fue migración aplicada. Conciliación: docs/sql/meetings-delivery-reconciliation.review.sql. Migración preparada: supabase/pending/20261012173000_meetings_mail_storage.sql. Usa CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, watermark ON CONFLICT DO NOTHING y reinstalación idempotente de sus tres triggers. Preflight falla si faltan tablas/columnas o roles; no crea el schema de negocio ni lo sustituye. Fuera de la ruta automática de migraciones hasta validar schema real en Preview. Ejecutar atómicamente; aplicación Production requiere confirmación final independiente.

Dependencias: meetings (id,user_id,title,meeting_date,start_time,end_time,location,created_at); meeting_participants (meeting_id,profile_id); meeting_events (meeting_id,actor_id,event_type); usuarios (id,auth_id,email,nombre_display,nombre,apellido); task_email_outbox (id,status,provider_message_id,sent_at); roles Supabase anon/authenticated/service_role; gen_random_uuid y PL/pgSQL. La migración añade solo siete tablas de correo, RPCs de mail y triggers de captura, sin backfill ni cambios de IDs/estados/responsables/historial, y sin cambiar RLS de tablas de negocio.

## Verificación real de entornos

Production ruedelunbtaomhrzgelc: catálogo de funciones public observado tras sesión segura; enqueue_meeting_mail no existe. Tablas, columnas, tipos, nulabilidad, triggers e índices relacionados revisados read-only. No se aplicó SQL.

Precheck encontró meeting_date nullable; la concatenación anterior podía producir text NULL. PR #102 usa coalesce(m.meeting_date::text,'Sin fecha') únicamente en el body. El snapshot sigue conservando date JSON null: no cambia reuniones, IDs ni fechas, no backfill. La prueba activa los triggers de creación y actualización con fecha NULL y verifica subject/body no NULL, texto Sin fecha y fecha intacta. Incluye una reunión histórica con fecha NULL y su versión de acta, ambas intactas tras instalaciones y rollback repetidos.

Previews existentes observados read-only: lilly-tasks-metrics-preview pyesjnjzcnvxargnugcl (40 tablas) y gina-phase-2-preview whuxnwjkpjccgzpzovha (37 tablas). Carecen de meetings/meeting_participants/meeting_events; no tienen la RPC. No aplicar allí una migración incompleta ni crear/importar schema de negocio a ciegas. La validación hosted staging NO está cerrada. No se creó otro entorno.

## Pruebas y rollback

scripts/qa/meeting-mail-migration.mjs: 25 comprobaciones PASS en PostgreSQL aislado/PGlite, cero emails/red/Production. Instala dos veces, conserva watermark y negocio, dedupe de destinatarios, replay accepted sin reenvío, reinstala con provider IDs intactos, rollback dos veces y retención de intentos, ACL authenticated denegada. Fixture sintético de dependencias actualizado con tipos, nulabilidad y unicidad observados en Production, incluida meeting_date date nullable, participants text[], meeting_events y meeting_report_versions. No es un clon integral ni un ensayo hosted de Production.

Rollback SQL: supabase/rollback/20261012173000_meetings_mail_storage.sql. No destructivo: retira exclusivamente sus tres triggers; conserva tablas, snapshots, provider IDs, RPCs y dedupe. Antes de usarlo: pausar worker/conciliación y restaurar deployment anterior verificado. Reaplicar migración restaura triggers sin resetear watermark. No borrar colas aceptadas ni historial.

Production LILLY sigue en e345a65 con Instant Rollback observado en Vercel; no se cambió. Meet standalone: deployment activo 7cS5XotV96hRyx3xCR5Lrxz4NkXC, Ready, main ec8ea248747c9d213e5392c32dee61f89e8e68fe, dominio meet.stratixsolutions.us; Instant Rollback visible. No pulsado, no redeploy, no retiro ni redirect. Repo/deployment/config se conservan.

## Identity inventory: solo bindings existentes

PR ANNIE #18 mergeado en 2c3ad8fdbdab3c9524e8cf4ac2fbae8b12b9a3c3. workflow_dispatch/identity-inventory definido en main; ejecuta ref ops/identity-inventory-readonly retenido con approved_source_sha e62ee8be1dfbe2f5d058fa084163c17171e4353a. Despacho manual observable bloqueado por protección de credenciales en este navegador; no se disparó inventario.

Metadata secretos/variables no accesible por el conector (endpoint no soportado). Existencia de LILLY_PRODUCTION_DATABASE_URL y LILLY_PRODUCTION_DB_HOST NO verificada, no nuevos secretos ni credenciales. Sesión Supabase dashboard no equivale a binding PostgreSQL del job.

ANNIE conexiones existentes: run 38150994213, job ssh-test 114504248667, 2026-10-11: SSH PASS read-only, servicios PASS y 33 migraciones leídas desde PostgreSQL. Esto verifica el mecanismo/secrets production-ssh entonces; no es un inventario nuevo ni prueba del release actual. Password DB permaneció dentro de contenedor según probe. Sin reproducción del job ni secreto expuesto.

QA delivery real de emails continúa pendiente por decisión del usuario, separada del código y del ensayo de schema. Compatibilidad de dependencias observadas y ensayo PostgreSQL aislado: PASS tras corregir fecha NULL. Aplicación de fix notifications no ejecutada; requiere confirmación final independiente. Hosted staging integral sigue sin verificarse. Listo para inventario: NO hasta binding LILLY y despacho accesible. Listo para redirect: NO hasta deployment LILLY compatible/verificado; rollback Meet disponible.
