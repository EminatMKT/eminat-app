import { salesAccess } from '@/server/sales-native/access'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { measureSalesStage, salesPerformanceAudit } from '@/server/sales-native/performance-audit'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

/** Read-only, request-local consolidation. The existing RPCs still enforce scope. */
export async function GET(request: Request) {
  const timing = salesPerformanceAudit()
  try {
    const actor = await measureSalesStage(timing.observe, 'actor_total',
      () => resolveSalesActor(request, timing.observe))
    const params = new URL(request.url).searchParams
    if (params.size && (params.size !== 1 || params.get('dashboard') !== '1'))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422, headers: timing.headers() })
    const admin = supabaseAdmin({ noStore: true })
    const args = { p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId }
    // A summary failure must not prevent authorized navigation to other sections.
    const summary = async () => {
      if (!params.has('dashboard')) return {}
      try {
        const { data, error } = await measureSalesStage(timing.observe, 'summary_rpc',
          () => admin.rpc('native_sales_report_summary', args))
        if (!error) return { summary: data }
        const response = nativeSalesDatabaseError(error)
        return { summaryError: { ...await response.json(), status: response.status } }
      } catch (error) {
        const response = nativeSalesErrorResponse(error)
        return { summaryError: { ...await response.json(), status: response.status } }
      }
    }
    const [directory, dashboard] = await Promise.all([
      measureSalesStage(timing.observe, 'directory_rpc', () => admin.rpc('native_sales_directory', args)),
      summary(),
    ])
    if (directory.error) return nativeSalesDatabaseError(directory.error)
    return Response.json({ access: salesAccess(actor), directory: directory.data, ...dashboard },
      { headers: timing.headers() })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
