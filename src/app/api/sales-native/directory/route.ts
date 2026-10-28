import { salesPerformanceAudit, measureSalesStage } from '@/server/sales-native/performance-audit'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const timing = salesPerformanceAudit()
  try {
    const actor = await measureSalesStage(timing.observe, 'actor_total', () => resolveSalesActor(request, timing.observe))
    if (new URL(request.url).searchParams.size)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const { data, error } = await measureSalesStage(timing.observe, 'directory_rpc', () => supabaseAdmin({ noStore: true }).rpc('native_sales_directory', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
    }))
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: timing.headers() })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
