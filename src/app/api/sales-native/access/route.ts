import { salesPerformanceAudit, measureSalesStage } from '@/server/sales-native/performance-audit'
import { NativeSalesAuthError, nativeSalesErrorResponse, resolveSalesActor,
  resolveSalesOrganizations } from '@/server/sales-native/auth'
import { salesCan } from '@/server/sales-native/policy'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const timing = salesPerformanceAudit()
  try {
    const actor = await measureSalesStage(timing.observe, 'actor_total', () => resolveSalesActor(request, timing.observe))
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
    }, { headers: timing.headers() })
  } catch (error) {
    // Keep Sales navigation available for an authorized multi-organization login.
    // No role or capabilities are combined across organizations.
    if (error instanceof NativeSalesAuthError && error.code === 'SALES_ORGANIZATION_REQUIRED' &&
        !request.headers.has('x-sales-organization-id')) {
      try {
        const organizations = await resolveSalesOrganizations(request, timing.observe)
        return Response.json({ allowed: true, organizationRequired: true, organizations },
          { headers: timing.headers() })
      } catch (discoveryError) { return nativeSalesErrorResponse(discoveryError) }
    }
    return nativeSalesErrorResponse(error)
  }
}
