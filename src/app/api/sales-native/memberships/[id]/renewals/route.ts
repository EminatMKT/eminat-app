import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { plans, saleDurations } from '@/server/sales-native/pricing'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const schema = z.object({ plan: z.enum(plans), duration: z.enum(saleDurations) }).strict()

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    if (!z.uuid().safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    if (new URL(request.url).searchParams.size)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const actor = await resolveSalesActor(request)
    const {data,error} = await supabaseAdmin({ noStore: true }).rpc('native_sales_list_renewal_requests', {
      p_organization_id: actor.organizationId,p_actor_member_id: actor.memberId,
      p_membership_id: context.params.id,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data:data ?? []},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {return nativeSalesErrorResponse(error)}
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    if (!z.uuid().safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const key=request.headers.get('idempotency-key')
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      return Response.json({code:'IDEMPOTENCY_KEY_REQUIRED'},{status:400})
    if (Number(request.headers.get('content-length') ?? '0')>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    let payload: unknown
    try {payload=await request.json()} catch {return Response.json({code:'INVALID_JSON'},{status:400})}
    if (Buffer.byteLength(JSON.stringify(payload))>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    const parsed=schema.safeParse(payload)
    if (!parsed.success) return Response.json({code:'VALIDATION_ERROR'},{status:422})
    const actor=await resolveSalesActor(request)
    const {data,error}=await supabaseAdmin({ noStore: true }).rpc('native_sales_request_renewal', {
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_membership_id:context.params.id,p_plan:parsed.data.plan,
      p_duration:parsed.data.duration,p_idempotency_key:key,p_request_id:randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data},{status:201,headers:{'Cache-Control':'no-store'}})
  } catch(error) {return nativeSalesErrorResponse(error)}
}
