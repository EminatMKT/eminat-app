import 'server-only'
import { createHash, randomUUID } from 'node:crypto'

export type PrivilegedAuditAction = 'admin.role.created' | 'admin.role.updated' | 'admin.role.deleted'
  | 'admin.user.updated' | 'admin.user.scopes.updated'
  | 'admin.catalog.created' | 'admin.catalog.updated' | 'admin.catalog.deleted'
type AuditEvent = {
  action: PrivilegedAuditAction
  actorId: string
  organizationId?: string | null
  resourceId?: string | null
  roleKey?: string
  changedFields?: string[]
}
type AuditClient = {
  rpc(name: string, args: Record<string, unknown>): {
    abortSignal(signal: AbortSignal): PromiseLike<{ error: unknown }>
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const identifier = (value?: string | null) => value && uuid.test(value) ? value : null
const fields = new Set(['label', 'modules', 'rol', 'tipo', 'activo', 'validado', 'empresa_id',
  'equipo_id', 'jornada_id', 'vinculacion_id', 'cargoIds', 'directorio_visible', 'codes',
  'nombre', 'apellido', 'email', 'color', 'ubicacion', 'codigo', 'departamento_id', 'lider_id'])

/** Bounded, metadata-only persistence after the business operation. Never accepts request bodies.
 * This additive audit cannot make a completed business write fail. A failed append remains an
 * explicit gap (structured warning), not a claim of atomic/durable complete coverage.
 */
export async function recordPrivilegedAction(db: AuditClient, event: AuditEvent) {
  const requestId = randomUUID()
  const metadata = {
    requestId, action: event.action, actorId: identifier(event.actorId),
    organizationId: identifier(event.organizationId), resourceId: identifier(event.resourceId),
    resourceKeyDigest: event.roleKey === undefined ? null
      : createHash('sha256').update(event.roleKey).digest('hex'),
    changedFields: Array.from(new Set((event.changedFields ?? []).filter(field => fields.has(field)))).sort(),
    outcome: 'SUCCESS' as const,
  }
  console.info('PRIVILEGED_AUDIT_EVENT', metadata)
  if (!metadata.actorId) {
    console.warn('PRIVILEGED_AUDIT_NOT_PERSISTED', { requestId, reason: 'ACTOR_INVALID' })
    return { requestId, persisted: false }
  }
  try {
    const { error } = await db.rpc('native_security_append_privileged_event', {
      p_request_id: requestId, p_action: metadata.action, p_actor_id: metadata.actorId,
      p_organization_id: metadata.organizationId, p_resource_id: metadata.resourceId,
      p_resource_key_digest: metadata.resourceKeyDigest, p_changed_fields: metadata.changedFields,
    }).abortSignal(AbortSignal.timeout(1500))
    if (!error) return { requestId, persisted: true }
  } catch { /* Provider details may contain PHI/secrets; never log them. */ }
  console.warn('PRIVILEGED_AUDIT_NOT_PERSISTED', { requestId, reason: 'APPEND_UNAVAILABLE' })
  return { requestId, persisted: false }
}
