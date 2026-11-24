import { patientPortalOrigin } from './deployment-stage'
import 'server-only'
import {supabaseAdmin} from '@/shared/db/supabaseAdmin'
import {complimentaryEmail} from './complimentary-email'
import {queuePatientEmail} from './patient-email-outbox'
export async function processComplimentaryNotifications(){
 const org=process.env.PATIENT_SALES_ORGANIZATION_ID??'',origin=process.env.COMPLIMENTARY_PORTAL_ORIGIN??''
 if(origin!==patientPortalOrigin())throw new Error('COMPLIMENTARY_NOT_CONFIGURED')
 if(!/^[0-9a-f-]{36}$/i.test(org)||!/^https:\/\/[a-z0-9.-]+$/.test(origin))throw new Error('COMPLIMENTARY_NOT_CONFIGURED')
 const {data,error}=await supabaseAdmin({noStore:true}).rpc('native_sales_complimentary_due',{p_org:org})
 if(error||!Array.isArray(data))throw new Error('COMPLIMENTARY_UNAVAILABLE')
 let queued=0,failed=0
 for(const row of data as {id:string;plan:string;expires_at:string;timezone:string;email:string;preferred_language?:string;days:number}[]){
  const eventId=`${row.id}-${Math.floor(Date.parse(row.expires_at)/1000)}-${row.days}`
  const result=await queuePatientEmail({kind:'activation',eventId,recipient:row.email,content:complimentaryEmail('expiration',row.preferred_language,{plan:row.plan,expiresAt:row.expires_at,timezone:row.timezone,actionUrl:`${origin}/membresia`})})
  if(['SENT','QUEUED'].includes(result.status))queued++;else failed++
 }
 return{processed:data.length,queued,failed}
}
