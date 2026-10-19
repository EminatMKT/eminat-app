import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic='force-dynamic'
const input=z.object({
  items:z.array(z.object({id:z.uuid(),version:z.number().int().positive()}).strict()).min(1).max(100)
    .refine(items => new Set(items.map(item => item.id)).size===items.length),
  ownerMemberId:z.uuid(),teamId:z.uuid().nullable(),
}).strict()

export async function POST(request:Request) {
  try {
    const actor=await resolveSalesActor(request)
    if (Number(request.headers.get('content-length') ?? '0')>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    let payload:unknown
    try { payload=await request.json() } catch { return Response.json({code:'INVALID_JSON'},{status:400}) }
    if (Buffer.byteLength(JSON.stringify(payload))>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    const parsed=input.safeParse(payload)
    if (!parsed.success) return Response.json({code:'VALIDATION_ERROR'},{status:422})
    const {data,error}=await supabaseAdmin({ noStore: true }).rpc('native_sales_bulk_reassign_leads',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_items:parsed.data.items,p_owner_member_id:parsed.data.ownerMemberId,
      p_team_id:parsed.data.teamId,p_request_id:randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data},{headers:{'Cache-Control':'no-store'}})
  } catch (error) { return nativeSalesErrorResponse(error) }
}
