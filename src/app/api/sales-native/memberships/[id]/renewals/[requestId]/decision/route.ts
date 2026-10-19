import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const schema=z.object({status:z.enum(['APPROVED','REJECTED']),note:z.string().trim().max(1000).optional()}).strict()

export async function POST(request:Request,context:{params:{id:string;requestId:string}}) {
  try {
    if (!z.uuid().safeParse(context.params.id).success ||
      !z.uuid().safeParse(context.params.requestId).success)
      return Response.json({code:'INVALID_ID'},{status:400})
    if (Number(request.headers.get('content-length') ?? '0')>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    let payload:unknown
    try {payload=await request.json()} catch {return Response.json({code:'INVALID_JSON'},{status:400})}
    if (Buffer.byteLength(JSON.stringify(payload))>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    const parsed=schema.safeParse(payload)
    if (!parsed.success) return Response.json({code:'VALIDATION_ERROR'},{status:422})
    const actor=await resolveSalesActor(request)
    const {data,error}=await supabaseAdmin().rpc('native_sales_review_renewal',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_membership_id:context.params.id,p_renewal_request_id:context.params.requestId,
      p_decision:parsed.data.status,p_note:parsed.data.note ?? null,p_request_id:randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {return nativeSalesErrorResponse(error)}
}
