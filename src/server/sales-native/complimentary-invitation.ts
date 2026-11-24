import { patientPortalOrigin } from './deployment-stage'
import 'server-only'
import {supabaseAdmin} from '@/shared/db/supabaseAdmin'
import {complimentaryEmail} from './complimentary-email'
import {queuePatientEmail} from './patient-email-outbox'
/** The opaque, one-use beneficiary token is encrypted by the existing mail outbox.
 * The member creates their own credentials with the existing verified registration flow.
 */
export async function sendComplimentaryInvitation(org:string,contactId:string,benefitId:string,code:string){
 if(process.env.NODE_ENV!=='production'||process.env.NEXT_PUBLIC_APP_ENV==='local')return 'NOT_CONFIGURED'
 const base=process.env.COMPLIMENTARY_PORTAL_ORIGIN??''
 let origin:URL
 try{origin=new URL(base)}catch{return 'NOT_CONFIGURED'}
 const allowed=origin.protocol==='https:' || process.env.NEXT_PUBLIC_APP_ENV==='local' && origin.hostname==='127.0.0.1'
 if(!allowed||origin.origin!==patientPortalOrigin()||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash)return 'NOT_CONFIGURED'
 const {data:contact,error}=await supabaseAdmin({noStore:true}).from('sales_contacts')
  .select('email,do_not_email,preferred_language').eq('organization_id',org).eq('id',contactId).is('archived_at',null).maybeSingle()
 if(error||!contact?.email)return 'UNAVAILABLE'
 if(contact.do_not_email)return 'SUPPRESSED'
 const {data:benefit,error:benefitError}=await supabaseAdmin({noStore:true}).from('sales_complimentary_benefits').select('plan,expires_at,timezone').eq('organization_id',org).eq('id',benefitId).maybeSingle()
 if(benefitError||!benefit)return 'UNAVAILABLE'
 const link=new URL('/invitacion',origin);link.hash=new URLSearchParams({code}).toString()
 const result=await queuePatientEmail({kind:'activation',eventId:`courtesy-invite-${benefitId}`,recipient:contact.email,content:complimentaryEmail('invitation',contact.preferred_language,{plan:benefit.plan,expiresAt:benefit.expires_at,timezone:benefit.timezone,actionUrl:link.toString()})})
 return result.status
}
