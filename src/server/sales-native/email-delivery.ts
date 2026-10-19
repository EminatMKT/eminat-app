import 'server-only'
import { Resend } from 'resend'

type EmailProvider={emails:{send:(message:{from:string;to:string;subject:string;text:string},
  options:{idempotencyKey:string})=>Promise<{data:{id:string}|null;error:{message:string}|null}>}}

export function nativeSalesEmailPolicy(env:Record<string,string|undefined>=process.env) {
  const mode=env.SALES_NATIVE_EMAIL_MODE
  const sender=env.SALES_NATIVE_EMAIL_FROM_EMAIL ?? ''
  const allowlist=new Set((env.SALES_NATIVE_EMAIL_QA_RECIPIENTS ?? '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean))
  const enabled=sender.length>0 &&
    (mode==='qa' && allowlist.size>0 || mode==='production' && env.SALES_NATIVE_EMAIL_PRODUCTION_APPROVED==='true')
  return {enabled,sender,permits:(email:string) => enabled &&
    (mode==='production' || allowlist.has(email.trim().toLowerCase()))}
}

export async function sendNativeSalesEmail(args:{id:string;recipient:string;subject:string;body:string},
  options:{provider?:EmailProvider;policy?:ReturnType<typeof nativeSalesEmailPolicy>}={}) {
  const policy=options.policy ?? nativeSalesEmailPolicy()
  if (!policy.permits(args.recipient)) return {outcome:'FAILED' as const,providerId:null}
  const apiKey=process.env.RESEND_API_KEY
  if (!options.provider && !apiKey) return {outcome:'FAILED' as const,providerId:null}
  const provider=options.provider ?? new Resend(apiKey!)
  try {
    const result=await provider.emails.send({from:policy.sender,to:args.recipient,
      subject:args.subject,text:args.body},{idempotencyKey:`lilly-native-sales-email/${args.id}`})
    if (result.error) return {outcome:'FAILED' as const,providerId:null}
    if (!result.data?.id) return {outcome:'UNKNOWN' as const,providerId:null}
    return {outcome:'SENT' as const,providerId:result.data.id}
  } catch {return {outcome:'UNKNOWN' as const,providerId:null}}
}
