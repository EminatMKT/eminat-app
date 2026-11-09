import 'server-only'
import { randomUUID } from 'node:crypto'

type SecurityEvent = {
  action: 'patient.profile.updated' | 'workforce.user.updated' | 'sales.access.denied'
  actorId?: string | null
  organizationId?: string | null
  resourceId?: string | null
  outcome: 'SUCCESS' | 'DENIED'
  changedFields?: string[]
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const identifier = (value?: string | null) => value && uuid.test(value) ? value : null
const fields = new Set(['phone', 'address', 'rol', 'tipo', 'activo', 'validado', 'empresa_id', 'cargoIds', 'directorio_visible'])

/** Metadata only. Bodies, field values, email addresses, tokens and error text are never accepted. */
export function recordSecurityEvent(event: SecurityEvent): string {
  const requestId = randomUUID()
  console.info('SECURITY_AUDIT_EVENT', {
    requestId,
    timestamp: new Date().toISOString(),
    action: event.action,
    actorId: identifier(event.actorId),
    organizationId: identifier(event.organizationId),
    resourceType: event.action.startsWith('patient.') ? 'patient_contact'
      : event.action.startsWith('workforce.') ? 'workforce_user' : 'sales_request',
    resourceId: identifier(event.resourceId),
    outcome: event.outcome,
    changedFields: Array.from(new Set((event.changedFields ?? []).filter(field => fields.has(field)))).sort(),
  })
  return requestId
}
