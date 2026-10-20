import 'server-only'
import { z } from 'zod'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

const jobSchema=z.object({
  id:z.uuid(),claimId:z.uuid(),organizationId:z.uuid(),scheduleId:z.uuid(),
  recipientMemberId:z.uuid(),recipientEmail:z.email(),
  periodFrom:z.iso.date(),periodTo:z.iso.date(),cadence:z.enum(['DAILY','WEEKLY']),
  reportPath:z.literal('/sales'),
})
type Job=z.infer<typeof jobSchema>
type Provider={emails:{send:(message:{from:string;to:string;subject:string;text:string},
  options:{idempotencyKey:string})=>Promise<{data:{id:string}|null;error:{message:string}|null}>}}

export function nativeReportMailPolicy(env:Record<string,string|undefined>=process.env) {
  const mode=env.SALES_NATIVE_REPORT_MAIL_MODE
  const sender=env.SALES_NATIVE_REPORT_FROM_EMAIL ?? ''
  const origin=env.SALES_NATIVE_REPORT_LINK_ORIGIN ?? ''
  const approved=mode==='qa' || (mode==='production' && env.SALES_NATIVE_REPORT_PRODUCTION_APPROVED==='true')
  const allowed=new Set((env.SALES_NATIVE_REPORT_QA_RECIPIENTS ?? '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean))
  let validOrigin=false
  try {const url=new URL(origin);validOrigin=url.protocol==='https:' && url.origin===origin}
  catch {validOrigin=false}
  const enabled=approved && sender.length>0 && validOrigin && (mode!=='qa' || allowed.size>0)
  return {enabled,sender,origin,permits:(email:string) => enabled &&
    (mode==='production' || allowed.has(email.trim().toLowerCase()))}
}

export async function processNativeSalesReports(options:{
  now?:Date;provider?:Provider;policy?:ReturnType<typeof nativeReportMailPolicy>;
  db?:ReturnType<typeof supabaseAdmin>
}={}) {
  const policy=options.policy ?? nativeReportMailPolicy()
  if (!policy.enabled) return {processed:0,sent:0,failed:0,reason:'DELIVERY_DISABLED'}
  const apiKey=process.env.RESEND_API_KEY
  if (!options.provider && !apiKey) return {processed:0,sent:0,failed:0,reason:'PROVIDER_UNAVAILABLE'}
  const db=options.db ?? supabaseAdmin({ noStore: true })
  const provider=options.provider ?? new Resend(apiKey!)
  const {data:rawJobs,error:claimError}=await db.rpc('native_sales_claim_due_reports',{
    p_now:(options.now ?? new Date()).toISOString(),p_limit:25,
  })
  if (claimError) throw new Error('REPORT_CLAIM_FAILED')
  let sent=0,failed=0
  for (const raw of rawJobs ?? []) {
    const parsed=jobSchema.safeParse(raw)
    if (!parsed.success) throw new Error('INVALID_REPORT_JOB')
    const job:Job=parsed.data
    let status:'SENT'|'FAILED'='FAILED'
    let providerId:string|null=null
    let errorCode:string|null=null
    if (!policy.permits(job.recipientEmail)) errorCode='RECIPIENT_NOT_ALLOWED'
    else {
      const {data:report,error:reportError}=await db.rpc('native_sales_report_detail',{
        p_organization_id:job.organizationId,p_actor_member_id:job.recipientMemberId,
        p_from:job.periodFrom,p_to:job.periodTo,
      })
      if (reportError || !report || typeof report!=='object') errorCode='REPORT_UNAVAILABLE'
      else {
        const summary=z.object({leads:z.object({total:z.number()}),
          opportunities:z.object({total:z.number(),won:z.number(),lost:z.number()}),
          memberships:z.object({sold:z.number()}),activities:z.object({total:z.number()}),
        }).safeParse(report)
        if (!summary.success) errorCode='REPORT_MALFORMED'
        else {
          const totals=summary.data
          const text=[`LILLY Sales summary · ${job.periodFrom} to ${job.periodTo}`,
            `Leads: ${totals.leads.total}`,
            `Opportunities: ${totals.opportunities.total}`,
            `Won: ${totals.opportunities.won}`,
            `Lost: ${totals.opportunities.lost}`,
            `Memberships sold: ${totals.memberships.sold}`,
            `Activities: ${totals.activities.total}`,
            `Open your scoped report: ${policy.origin}${job.reportPath}`].join('\n')
          try {
            const result=await provider.emails.send({from:policy.sender,to:job.recipientEmail,
              subject:`LILLY Sales summary · ${job.periodTo}`,text},
              {idempotencyKey:`lilly-native-sales-report/${job.id}`})
            if (result.error || !result.data?.id) errorCode='PROVIDER_OUTCOME_UNKNOWN'
            else {status='SENT';providerId=result.data.id}
          } catch {errorCode='PROVIDER_OUTCOME_UNKNOWN'}
        }
      }
    }
    const {data:recorded,error:finishError}=await db.rpc('native_sales_finish_report_delivery',{
      p_delivery_id:job.id,p_claim_id:job.claimId,p_status:status,
      p_provider_message_id:providerId,p_error_code:errorCode,
    })
    if (finishError || !recorded) throw new Error('REPORT_OUTCOME_NOT_RECORDED')
    if (status==='SENT') sent++
    else failed++
  }
  return {processed:sent+failed,sent,failed,reason:failed?'DELIVERY_REVIEW_REQUIRED':null}
}
