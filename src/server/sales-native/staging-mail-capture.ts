import 'server-only'
import {readFile} from 'node:fs/promises'
import {isSyntheticRecipient} from './deployment-stage'

/** Private capture transport. Never follows redirects or falls back to an external sender. */
export async function captureStagingMail(message:{recipient:string;subject:string;html:string;text:string},env:Record<string,string|undefined>){
 if(env.NEXT_PUBLIC_APP_ENV!=='staging'||env.STAGING_MAILPIT_API_BASE_URL!=='http://mailpit:8025/'||env.STAGING_MAILPIT_AUTH_FILE!=='/run/secrets/mailpit-ui-auth'||!isSyntheticRecipient(message.recipient))return {status:'NOT_CONFIGURED' as const}
 try{
  const credential=(await readFile('/run/secrets/mailpit-ui-auth','utf8')).trim()
  if(!/^review:[A-Za-z0-9_-]{40,100}$/.test(credential))return {status:'NOT_CONFIGURED' as const}
  const response=await fetch('http://mailpit:8025/api/v1/send',{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json',Authorization:`Basic ${Buffer.from(credential).toString('base64')}`},body:JSON.stringify({From:{Email:'capture@example.invalid',Name:'Corazón Salud STAGING'},To:[{Email:message.recipient}],Subject:message.subject,HTML:message.html,Text:message.text})})
  if(!response.ok)return {status:'FAILED' as const}
  const result:unknown=await response.json()
  if(!result||typeof result!=='object'||!('ID'in result)||typeof result.ID!=='string')return {status:'UNKNOWN' as const}
  return {status:'SENT' as const,providerId:`mailpit-${result.ID}`}
 }catch{return {status:'UNKNOWN' as const}}
}
