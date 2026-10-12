# Meetings: auditoría de notificaciones y actas
Fecha 2026-10-12. Baseline LILLY e345a65. Scope: notificaciones/email/PDF únicamente.

## Evidencia y límites
Inspección de código en main, tests con Supabase/Resend simulados y PDF real generado localmente.
No POST a Production: incluso action=download inserta meeting_report_versions y meeting_events.
No finalización, cambio de estado, asistencia, responsables ni reenvío de reuniones históricas.
No se enviaron mensajes a usuarios reales ni a QA real; todos los ejemplos usan example.test y proveedor stub.
No se dispone en esta sesión de conector de logs Resend/DB Production. Aceptación SDK != entrega real.
La suite demuestra comportamiento del fix, no su despliegue ni entrega en buzón. Meetings notifications sigue ABIERTO y redirect no listo.
Diana 48 Tasks y Meetings se aceptan validados/cerrados por el usuario; no se reauditan ni modifican.

## Circuitos actuales
| Evento | Productor / evidencia | Resultado de auditoría |
| --- | --- | --- |
| Crear Meeting | NewMeeting inserta meeting/convocados, meeting_events y Activity vinculada | No se encontró envío de invitación email; assignment de Activity no equivale a invitación |
| Actualizar Meeting / asistencia | MeetingDetail y services actualizan y registran historia | No se encontró notificación email de cambios de fecha/lugar/convocatoria |
| Crear / asignar Task | API integrations/meet/tasks llama dispatcher compartido tras escritura | Outbox Tasks, trigger assignment e inbox existentes; entrega real no verificada |
| Cambiar responsable | API integrations/meet/tasks/[activityId] y trigger actividad_responsables | Dispatcher/outbox actuales; no modificar ni duplicar productor |
| Estado relevante | Actualización Task/historial | No se encontró email de transición de estado en flujo Meetings; falta definir eventos relevantes/destinatarios |
| Recordatorios | Cron Tasks procesa assignment pendiente a diario | No demuestra recordatorio Meeting/vencimiento; no se encontró scheduler de recordatorio Meetings |
| Finalizar Meeting | MeetingDetail actualiza status y llama meeting-report | Error email no revierte finalización; reintento debe ser independiente y no tocar estado |
| Generar PDF | createMeetingPdf con datos Meeting/topics + Tasks canónicas | PDF local comprobado; cambios y reportes históricos intactos |
| Enviar acta | POST /api/meeting-report → Resend + versiones/eventos | Bugs de destinatarios y reintento parcial, corregidos en PR; entrega real aún sin evidencia |

Tasks assignment posee claim RPC atómico, secuencia por asignación, idempotency key por evento, provider_message_id, retries de errores explícitos hasta cinco veces con backoff; transport incierto queda sending para conciliación, no replay ciego.
In-app notifications se encolan por el trigger de asignación. Esto no cubre automáticamente creación/updates del Meeting, recordatorios o estados.
docs/lilly-task-assignment-notifications.md exige companion standalone Meet quitando /api/notify-task antes del cutover. Repo standalone no fue accesible mediante connector (404): retirada de segundo productor NO verificada. No declarar duplicados globales resueltos.

## Causas exactas y fix incluido
1. API calculaba attendedProfiles filtrando convocados por nombres de asistentes. Ausentes quedaban excluidos; creador y responsables no convocados tampoco entraban.
   Fix: convocatoria completa + creador autenticado (gate existente solo permite owner) + TODOS los responsables canónicos de Tasks, con lookup de email vía caller RLS. El PDF muestra el conjunto completo de responsables, no solo el principal. Asistencia sigue solo clasificación del PDF.
2. Dedupe lowercase sin trim rechazaba emails válidos con espacios y no normalizaba consistentemente.
   Fix: trim+lowercase antes de validar/deduplicar. Sin inferir emails ni direcciones por nombre.
3. API aceptaba Task retornada sin verificar que el ID coincidiera con el solicitado.
   Fix: ID exacto requerido; ninguna Task de otra respuesta puede entrar en el acta.
4. Reutilizaba solo versiones sin sent_at, por lo que un envío parcial generaba otro PDF/fecha; provider key basada únicamente en meetings.updated_at no incluía cambios de Topics/Tasks/locale.
   Fix: reutilizar snapshot canónico también tras parcial; persistir snapshot antes de envío; fingerprint del mensaje completo/remitente/PDF + hash del correo. Version-query/save error bloquea envío.
5. SDK sin error se marcaba sent aunque no hubiera ID, y no se guardaba provider ID.
   Fix: exigir data.id y registrar provider_message_id por aceptación en meeting_events metadata. Mantener sent por compatibilidad, documentado como accepted, no delivered.

No se cambian auth, RLS, permisos, CRUD Tasks, IDs, status ni responsables. No se crean tablas/migraciones.
Si no es posible resolver un responsable mediante el scope del llamante, envío falla antes de producir un acta incompleta; nunca elevar a service_role para eludir RLS.
Los convocados pueden incluir perfiles históricos/inactivos: no excluirlos por asistencia ni por estado de perfil; falta/invalid email se registra como omisión explícita.
El creador solo puede ser el owner actual por el gate existente; no ampliar permiso para otro actor.

## Destinatarios
- Creador: perfil del owner autenticado.
- Convocados asistentes y ausentes: meeting_participants → usuarios.email, independiente de meetings.participants.
- Responsables y colaboradores Task: IDs de responsables de API canónica, perfiles autorizados, nunca solo líder.
- Participante externo: meetings.participants contiene nombres (string[]), sin identificador/email estructurado. No inventar correo; omisión visible.
- Invitado externo con correo: modelo actual no aporta dirección verificable. Requiere contrato futuro de invitados externos antes de poder certificar regla universal.
La asistencia basada en nombres no se cambia: posible homonimia afecta clasificación existente, nunca debe gatear email.

## Pendientes para cierre funcional
No se declara garantía exactly-once duradera. Resend conserva idempotency keys 24h y exige el mismo payload:
https://resend.com/changelog/idempotency-keys
https://www.resend.com/blog/engineering-idempotency-keys
Fingerprint+snapshot arreglan reintentos parciales dentro de esa ventana; después, reenviar manualmente puede duplicar destinatarios ya aceptados.
El esquema meeting_report_versions y sus restricciones no figura en las migraciones locales inspeccionadas: verificar contrato desplegado read-only antes de release; no asumir atomicidad/version unique.
Pendiente diseño aprobado outbox actas por meeting+snapshot/locale+recipient con claim atómico, accepted durable, unknown/reconcile, retries acotados, DLQ y exclusión persistente de destinatarios aceptados. No se introduce una migración a ciegas.
Pendiente entrega/bounce/webhook firmado/replay y logs provider; correlación provider_message_id añadido permite futura conciliación.
Pendiente modelo QA controlado para invitaciones/updates/estados/recordatorios con matriz explícita (no mandar emails masivos por cada attendance edit).
No añadir envíos directos en componentes: productores de eventos transaccionales y dispatcher único Core Notifications.
No hacer doble notificación desde Meet antiguo y LILLY.

## Gate QA antes de release / redirect
En entorno aislado y cuentas controladas autorizadas:
- Meeting nueva con creador no convocado, asistente, ausente, responsables múltiple y duplicado por email/case; externo con correo cuando exista contrato.
- Verificar asunto, remitente autorizado, reunión/Tasks/responsables/fecha/hora y hash/adjunto PDF.
- Capturar accepted → delivered/bounced de proveedor por destinatario sin inferir inbox de HTTP 200.
- Fallo explícito, transport desconocido, partial retry, request concurrente, retry >24h y cambio de contenido; no duplicar recipients previamente accepted.
- Revisar logs auditados, omisiones y DLQ sin datos sensibles.
- Confirmar solo un productor Task entre antiguo Meet y LILLY.
Este gate pendiente no reabre Diana/Tasks ni las auditorías UI cerradas.

## Validación del PR
Tests API con provider/network stub: asistentes/ausentes/creador, assignees múltiples, scope/auth/finalizada, ID exacto, error read/save fail-closed, mismo PDF/key en partial retry, ausencia provider ID; PDF generado real.
Tests del resolver: normalización/dedupe, missing/invalid, sin correos inferidos.
Validación local: suite completa 418 archivos / 1761 tests PASS con TZ=America/Guayaquil; tras añadir casos de scope y cambio de contenido, los 14 tests específicos PASS. Typecheck, next lint y build con credenciales dummy PASS. Dos warnings preexistentes de BillingCalendar sin modificar ese módulo.

