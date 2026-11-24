import { patientPortalOrigin } from './deployment-stage'
import 'server-only'
import {createHash} from 'node:crypto'
import {supabaseAdmin} from '@/shared/db/supabaseAdmin'
import {queuePatientEmail} from './patient-email-outbox'
import {complimentaryEmail,type ComplimentaryEmailEvent} from './complimentary-email'
/** Email failure never reverses a committed coverage change. Development never sends or queues mail. */
export async function queueComplimentaryEvent(org:string,benefitId:string,event:ComplimentaryEmailEvent,operationKey:string){
 if(process.env.NODE_ENV!=='production'||process.env.NEXT_PUBLIC_APP_ENV==='local')return 'LOCAL_PREVIEW'
 try{
  const base=new URL(process.env.COMPLIMENTARY_PORTAL_ORIGIN??'')
  if(base.origin!==patientPortalOrigin()||base.pathname!=='/'||base.search||base.hash||base.username||base.password)return 'NOT_CONFIGURED'
  const db=supabaseAdmin({noStore:true})
  const {data:b,error}=await db.from('sales_complimentary_benefits').select('id,plan,expires_at,timezone,beneficiary_contact_id').eq('organization_id',org).eq('id',benefitId).maybeSingle()
  if(error||!b?.beneficiary_contact_id)return 'UNAVAILABLE'
  const {data:c,error:contactError}=await db.from('sales_contacts').select('email,do_not_email,preferred_language').eq('organization_id',org).eq('id',b.beneficiary_contact_id).is('archived_at',null).maybeSingle()
  if(contactError||!c?.email)return 'UNAVAILABLE'
  if(c.do_not_email)return 'SUPPRESSED'
  const eventId=createHash('sha256').update([org,benefitId,event,operationKey].join(':')).digest('hex')
  const result=await queuePatientEmail({kind:'activation',eventId,recipient:c.email,content:complimentaryEmail(event,c.preferred_language,{plan:b.plan,expiresAt:b.expires_at,timezone:b.timezone,actionUrl:new URL('/membresia',base).toString()})})
  return result.status
 }catch{return 'UNAVAILABLE'}
}
export async function queueComplimentaryRedemption(org:string,codeHash:string){
 if(process.env.NODE_ENV!=='production'||process.env.NEXT_PUBLIC_APP_ENV==='local')return 'LOCAL_PREVIEW'
 try{
  const {data:b,error}=await supabaseAdmin({noStore:true}).from('sales_complimentary_benefits').select('id,activation_method').eq('organization_id',org).eq('code_hash',codeHash).maybeSingle()
  if(error||!b)return 'UNAVAILABLE'
  // Claiming an access invitation does not create a second activation notification.
  if(b.activation_method!=='REDEMPTION_CODE')return 'NOT_APPLICABLE'
  return queueComplimentaryEvent(org,b.id,'activation',b.id)
 }catch{return 'UNAVAILABLE'}
}
