import 'server-only'
import { salesCan, type SalesActor } from './policy'

/** The same organization-scoped capabilities for access and initial bootstrap. */
export function salesAccess(actor: SalesActor) {
  return {
    allowed: true,
    role: actor.role,
    organizationId: actor.organizationId,
    capabilities: {
      canWrite: salesCan(actor, 'sales:write'),
      canReassign: salesCan(actor, 'sales:reassign'),
      canReadAudit: salesCan(actor, 'sales:audit'),
      canReadPayments: salesCan(actor, 'sales:payments:read'),
      canManageSocial: salesCan(actor, 'sales:social:manage'),
      canConfigureReports: salesCan(actor, 'sales:configuration'),
    },
  }
}
