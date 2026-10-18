import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { isLeadStatus } from '@/server/sales-native/lead-lifecycle'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['q', 'limit', 'offset', 'status'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const limit = params.has('limit') ? Number(params.get('limit')) : 25
    const offset = params.has('offset') ? Number(params.get('offset')) : 0
    const q = params.get('q')?.trim() || null
    const status = params.get('status') || null
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 100000 ||
        (q !== null && q.length > 200) || (status !== null && !isLeadStatus(status)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_visible_leads', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_limit: limit,
      p_offset: offset,
      p_q: q,
      p_status: status,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0) === limit ? offset + limit : null },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
