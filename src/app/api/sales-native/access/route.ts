import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { salesCan } from '@/server/sales-native/policy'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    return Response.json({
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
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
