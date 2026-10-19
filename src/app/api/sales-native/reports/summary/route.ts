import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (new URL(request.url).searchParams.size)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_report_summary', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
