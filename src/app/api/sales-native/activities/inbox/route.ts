import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['status', 'limit', 'offset'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const status = params.get('status')
    const limit = Number(params.get('limit') ?? '50')
    const offset = Number(params.get('offset') ?? '0')
    if ((status !== null && !['PENDING', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(status)) ||
        !Number.isSafeInteger(limit) || limit<1 || limit>100 ||
        !Number.isSafeInteger(offset) || offset<0 || offset>100000)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_activity_inbox', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_status: status, p_limit: limit, p_offset: offset,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0)===limit ? offset+limit : null },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
