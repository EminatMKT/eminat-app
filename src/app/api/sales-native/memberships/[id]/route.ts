import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    if (!z.uuid().safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    const { data, error } = await supabaseAdmin().rpc('native_sales_visible_memberships', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_limit: 1, p_offset: 0, p_q: null, p_id: context.params.id, p_demo: null,
    })
    if (error) return nativeSalesDatabaseError(error)
    if (!data?.length) return Response.json({ code: 'NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return Response.json({ data: data[0] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
