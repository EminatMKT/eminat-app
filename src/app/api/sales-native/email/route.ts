import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesEmailPolicy, sendNativeSalesEmail } from '@/server/sales-native/email-delivery'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { salesCan } from '@/server/sales-native/policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic='force-dynamic'
const schema=z.object({resource:z.enum(['leads','contacts','accounts']),recordId:z.uuid(),
  subject:z.string().trim().min(1).max(240),body:z.string().trim().min(1).max(20000)}).strict()

export async function POST(request:Request) {
  try {
    const actor=await resolveSalesActor(request)
    if (!salesCan(actor,'sales:email')) return Response.json({code:'SALES_ACCESS_DENIED'},{status:403})
    const policy=nativeSalesEmailPolicy()
    if (!policy.enabled) return Response.json({code:'SALES_EMAIL_DISABLED'},{status:503})
    const key=request.headers.get('idempotency-key')
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      return Response.json({code:'IDEMPOTENCY_KEY_REQUIRED'},{status:400})
    if (Number(request.headers.get('content-length') ?? '0')>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    let payload:unknown
    try {payload=await request.json()} catch {return Response.json({code:'INVALID_JSON'},{status:400})}
    if (Buffer.byteLength(JSON.stringify(payload))>32768)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    const parsed=schema.safeParse(payload)
    if (!parsed.success) return Response.json({code:'VALIDATION_ERROR'},{status:422})
    const body=parsed.data
    const hash=createHash('sha256').update(JSON.stringify([
      body.resource,body.recordId,body.subject,body.body])).digest('hex')
    const db=supabaseAdmin({ noStore: true })
    const {data:queued,error:queueError}=await db.rpc('native_sales_queue_email',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_resource:body.resource,p_record_id:body.recordId,p_subject:body.subject,p_body:body.body,
      p_idempotency_key:key,p_payload_hash:hash,p_request_id:randomUUID(),
    })
    if (queueError) return nativeSalesDatabaseError(queueError)
    const row=z.object({id:z.uuid(),email_to:z.email(),title:z.string(),body:z.string(),
      email_delivery_status:z.string()}).safeParse(queued)
    if (!row.success) return Response.json({code:'SALES_EMAIL_UNAVAILABLE'},{status:503})
    if (row.data.email_delivery_status!=='QUEUED')
      return Response.json({data:{status:row.data.email_delivery_status,replayed:true}},
        {headers:{'Cache-Control':'no-store'}})
    const {data:claimed,error:claimError}=await db.rpc('native_sales_claim_email',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,p_activity_id:row.data.id,
    })
    if (claimError) return nativeSalesDatabaseError(claimError)
    if (!claimed) return Response.json({data:{status:'SENDING',replayed:true}},
      {status:202,headers:{'Cache-Control':'no-store'}})
    const result=await sendNativeSalesEmail({id:row.data.id,recipient:row.data.email_to,
      subject:row.data.title,body:row.data.body},{policy})
    const {data:finished,error:finishError}=await db.rpc('native_sales_finish_email',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_activity_id:row.data.id,p_outcome:result.outcome,p_provider_id:result.providerId,
      p_request_id:randomUUID(),
    })
    if (finishError || !finished) return Response.json({code:'SALES_EMAIL_OUTCOME_UNKNOWN'},
      {status:503,headers:{'Cache-Control':'no-store'}})
    return Response.json({code:result.outcome==='SENT' ? undefined :
      result.outcome==='UNKNOWN' ? 'SALES_EMAIL_OUTCOME_UNKNOWN' : 'SALES_EMAIL_FAILED',
      data:{status:result.outcome}},
      {status:result.outcome==='SENT' ? 200 : 503,headers:{'Cache-Control':'no-store'}})
  } catch(error) {return nativeSalesErrorResponse(error)}
}
