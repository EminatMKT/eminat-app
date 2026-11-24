import { resolveSalesActor, nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { readJsonObject } from '@/server/read-json-object'
import { complimentaryCode, complimentaryDigest, complimentaryEnabled, complimentaryError,
  complimentaryInput, complimentaryResponse as respond, admitComplimentary } from '@/server/sales-native/complimentary'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function actor(request: Request) {
  const user = await resolveSalesActor(request)
  return ['ADMINISTRATOR','SUPERADMIN'].includes(user.role) ? user : null
}
export async function GET(request: Request) {
  if (!complimentaryEnabled()) return respond({code:'NOT_FOUND'},404)
  try {
    const user = await actor(request)
    if (!user) return respond({code:'COMPLIMENTARY_FORBIDDEN'},403)
    const params=new URL(request.url).searchParams
    const offset=Number(params.get('offset') ?? 0)
    if (!Number.isSafeInteger(offset)||offset<0||offset>100000||(params.get('q')?.length??0)>160) return respond({code:'INVALID_REQUEST'},422)
    const db=supabaseAdmin({noStore:true})
    if(params.get('custom')==='1'){const {data,error}=await db.from('sales_complimentary_custom_requests').select('id,plan,duration_months,expiration_date,timezone,reason,requested_by,status,created_at').eq('organization_id',user.organizationId).order('created_at',{ascending:false}).range(offset,offset+49);return error?complimentaryError(error):respond({data})}
    const {data,error}=await db.rpc('native_sales_complimentary_list',{
      p_org:user.organizationId,p_actor:user.memberId,p_offset:offset,p_query:params.get('q')??'',p_status:params.get('status')??'',
    })
    if(error)return complimentaryError(error)
    const benefit=params.get('benefit')
    if(benefit){
      if(!/^[0-9a-f-]{36}$/i.test(benefit))return respond({code:'INVALID_REQUEST'},422)
      const {data:events,error:eventError}=await db.from('sales_complimentary_events')
        .select('id,benefit_id,actor_member_id,actor_auth_id,action,reason,changes,created_at')
        .eq('organization_id',user.organizationId).eq('benefit_id',benefit)
        .order('created_at',{ascending:false}).range(offset,offset+49)
      return eventError?complimentaryError(eventError):respond({data:events})
    }
    return respond({data})
  }catch(error){return nativeSalesErrorResponse(error)}
}
export async function POST(request: Request) {
  if(!complimentaryEnabled())return respond({code:'NOT_FOUND'},404)
  try{
    const user=await actor(request)
    if(!user)return respond({code:'COMPLIMENTARY_FORBIDDEN'},403)
    const input=complimentaryInput.safeParse(await readJsonObject(request,4096))
    if(!input.success)return respond({code:'INVALID_REQUEST'},422)
    if(!await admitComplimentary(`staff:${user.memberId}`))return respond({code:'RATE_LIMITED'},429)
    const value=input.data,db=supabaseAdmin({noStore:true})
    if(value.action==='CONFIGURE'){
      const {data,error}=await db.rpc('native_sales_complimentary_configure',{
        p_org:user.organizationId,p_actor:user.memberId,p_timezone:value.timezone,p_days:value.notificationDays,p_enabled:value.enabled,
      })
      return error?complimentaryError(error):respond({data})
    }
    if(value.action==='CUSTOM_REQUEST'){
      if(user.role!=='SUPERADMIN')return respond({code:'COMPLIMENTARY_CUSTOM_FORBIDDEN'},403)
      const {data,error}=await db.rpc('native_sales_complimentary_custom_request',{p_org:user.organizationId,p_actor:user.memberId,p_key:value.requestKey,p_plan:value.plan,p_months:value.months,p_expiration:value.expirationDate,p_reason:value.reason,p_contact:value.contactId});return error?complimentaryError(error):respond({data},data?.replayed?200:201)
    }
    if(value.action==='ISSUE'){
      if(value.contactId){
        const {data:contact,error:contactError}=await db.from('sales_contacts')
          .select('first_name,last_name').eq('organization_id',user.organizationId)
          .eq('id',value.contactId).is('archived_at',null).maybeSingle()
        if(contactError)return complimentaryError(contactError)
        if(!contact)return respond({code:'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'},409)
        if(!contact.first_name?.trim()||!contact.last_name?.trim())
          return respond({code:'COMPLIMENTARY_CONTACT_INCOMPLETE'},422)
      }
      const code=complimentaryCode()
      const {data,error}=await db.rpc('native_sales_complimentary_issue',{
        p_org:user.organizationId,p_actor:user.memberId,p_key:value.requestKey,p_hash:complimentaryDigest(JSON.stringify(value)),
        p_plan:value.plan,p_months:value.months,p_reason:value.reason,p_contact:value.contactId,p_campaign:value.campaign,
        p_method:value.method,p_code_hash:code?complimentaryDigest(code):null,p_valid_from:value.validFrom,p_redeem_before:value.redeemBefore,
      })
      if(error)return complimentaryError(error)
      let invitationDelivery:string|null=null
      if(value.method==='ADMIN_DIRECT' && !data?.replayed && value.contactId){
        const {sendComplimentaryInvitation}=await import('@/server/sales-native/complimentary-invitation')
        invitationDelivery=await sendComplimentaryInvitation(user.organizationId,value.contactId,String(data.id),code)
      }
      if(value.method==='ADMIN_DIRECT'&&!data?.replayed){const {queueComplimentaryEvent}=await import('@/server/sales-native/complimentary-mail');await queueComplimentaryEvent(user.organizationId,String(data.id),'activation',value.requestKey)}
      return respond({data,code:data?.replayed?null:code,invitationDelivery},data?.replayed?200:201)
    }
    const actionKey=request.headers.get('idempotency-key')??''
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey))return respond({code:'INVALID_REQUEST'},422)
    const {data,error}=await db.rpc('native_sales_complimentary_action',{
      p_org:user.organizationId,p_actor:user.memberId,p_id:value.id,p_action:value.action,p_months:value.months,p_reason:value.reason,p_key:actionKey,
    })
    if(error)return complimentaryError(error)
    const event=value.action==='SUSPEND'?'suspension':value.action==='REVOKE'?'revocation':value.action==='REACTIVATE'?'reactivation':null
    if(event&&!data?.replayed){const {queueComplimentaryEvent}=await import('@/server/sales-native/complimentary-mail');await queueComplimentaryEvent(user.organizationId,value.id,event,actionKey)}
    return respond({data})
  }catch(error){return nativeSalesErrorResponse(error)}
}
