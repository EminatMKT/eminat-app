import {z} from 'zod'
import {resolveSalesActor,nativeSalesErrorResponse} from '@/server/sales-native/auth'
import {nativeSalesDatabaseError} from '@/server/sales-native/errors'
import {supabaseAdmin} from '@/shared/db/supabaseAdmin'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store'}
const query=z.object({opportunityId:z.uuid().optional(),membershipId:z.uuid().optional()}).strict()
  .refine(value=>!!value.opportunityId!==!!value.membershipId)
const decision=z.object({intentId:z.uuid(),memberId:z.uuid(),decision:z.enum(['APPROVED','REJECTED']),expectedUpdatedAt:z.iso.datetime({offset:true})}).strict()
export async function GET(request:Request){
 try{
  const actor=await resolveSalesActor(request),parsed=query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if(!parsed.success)return Response.json({code:'INVALID_FILTER'},{status:422,headers})
  const {data,error}=await supabaseAdmin({noStore:true}).rpc('native_sales_family_preparation_status',{
   p_org:actor.organizationId,p_actor:actor.memberId,p_opportunity:parsed.data.opportunityId??null,p_membership:parsed.data.membershipId??null,
  })
  if(error)return nativeSalesDatabaseError(error)
  const history=parsed.data.membershipId?await supabaseAdmin({noStore:true}).rpc('native_sales_family_billing_history',{
    p_org:actor.organizationId,p_actor:actor.memberId,p_membership:parsed.data.membershipId,
  }):{data:[],error:null}
  return history.error?nativeSalesDatabaseError(history.error):Response.json({data,history:history.data??[]},{headers})
 }catch(error){return nativeSalesErrorResponse(error)}
}
export async function POST(request:Request){
 try{
  const actor=await resolveSalesActor(request),key=request.headers.get('idempotency-key')
  if(!z.uuid().safeParse(key).success)return Response.json({code:'IDEMPOTENCY_KEY_REQUIRED'},{status:400,headers})
  if(Number(request.headers.get('content-length')??0)>4096)return Response.json({code:'BODY_TOO_LARGE'},{status:413,headers})
  let body:unknown;try{body=await request.json()}catch{return Response.json({code:'INVALID_JSON'},{status:400,headers})}
  if(Buffer.byteLength(JSON.stringify(body))>4096)return Response.json({code:'BODY_TOO_LARGE'},{status:413,headers})
  const parsed=decision.safeParse(body)
  if(!parsed.success)return Response.json({code:'VALIDATION_ERROR'},{status:422,headers})
  const value=parsed.data
  const {data,error}=await supabaseAdmin({noStore:true}).rpc('native_sales_review_family_preparation',{
   p_org:actor.organizationId,p_actor:actor.memberId,p_intent:value.intentId,p_member:value.memberId,
   p_decision:value.decision,p_expected_updated_at:value.expectedUpdatedAt,p_key:key,
  })
  return error?nativeSalesDatabaseError(error):Response.json({data},{headers})
 }catch(error){return nativeSalesErrorResponse(error)}
}
