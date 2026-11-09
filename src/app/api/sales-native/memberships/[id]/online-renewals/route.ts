import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params:{ id:string } }) {
  try {
    if (!z.uuid().safeParse(context.params.id).success) return Response.json({ code:'INVALID_ID' },{ status:400 })
    const params = new URL(request.url).searchParams
    const offset = Number(params.get('offset') ?? 0), limit = Number(params.get('limit') ?? 25)
    if (Array.from(params.keys()).some(key => !['limit','offset'].includes(key)) ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      return Response.json({ code:'INVALID_FILTER' },{ status:422 })
    const actor = await resolveSalesActor(request)
    const { data,error } = await supabaseAdmin({ noStore:true }).rpc('native_sales_online_renewal_status', {
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,p_membership_id:context.params.id,p_limit:limit,p_offset:offset,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data:data ?? [],nextOffset:data?.length === limit ? offset+limit : null },{ headers:{'Cache-Control':'no-store'} })
  } catch(error) { return nativeSalesErrorResponse(error) }
}
