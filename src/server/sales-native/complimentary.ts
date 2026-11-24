import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const complimentaryEnabled = () => process.env.LILLY_COMPLIMENTARY_ENABLED === 'true'
export const complimentaryDigest = (value: string) => createHash('sha256').update(value).digest('hex')
export const complimentaryCode = () => `csco_${randomBytes(32).toString('base64url')}`
export const codeInput = z.object({ code: z.string().trim().regex(/^csco_[A-Za-z0-9_-]{43}$/), preview: z.boolean() }).strict()
export const complimentaryInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ISSUE'), requestKey: z.uuid(), plan: z.enum(['ESSENTIAL','PLUS','MAX']),
    months: z.union([z.literal(3),z.literal(6),z.literal(12)]), reason: z.string().trim().min(1).max(500),
    contactId: z.uuid().nullable(), campaign: z.string().trim().min(1).max(160).nullable(),
    method: z.enum(['ADMIN_DIRECT','REDEMPTION_CODE']),
    validFrom: z.iso.datetime({ offset: true }), redeemBefore: z.iso.datetime({ offset: true }),
  }).strict().refine(value => Date.parse(value.redeemBefore) > Date.parse(value.validFrom) &&
    (value.method !== 'ADMIN_DIRECT' || value.contactId !== null)),
  z.object({ action:z.literal('CUSTOM_REQUEST'),requestKey:z.uuid(),plan:z.enum(['ESSENTIAL','PLUS','MAX']),months:z.number().int().min(1).max(120).refine(value=>![3,6,12].includes(value)),expirationDate:z.iso.date(),reason:z.string().trim().min(1).max(500),contactId:z.uuid().nullable() }).strict(),
  z.object({ action: z.enum(['EXTEND','SUSPEND','REVOKE','REACTIVATE']), id: z.uuid(),
    months: z.union([z.literal(3),z.literal(6),z.literal(12)]).nullable(), reason: z.string().trim().min(1).max(500),
  }).strict().refine(value=>value.action==='EXTEND'?value.months!==null:value.months===null),
  z.object({ action: z.literal('CONFIGURE'), timezone: z.string().min(1).max(100),
    notificationDays: z.array(z.number().int().min(0).max(365)).max(10), enabled: z.boolean(),
  }).strict(),
])
export const complimentaryResponse = (body: unknown, status = 200) => Response.json(body,
  { status, headers: { 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' } })
export function complimentaryError(error: { message: string }) {
  const code = ['COMPLIMENTARY_FORBIDDEN','COMPLIMENTARY_CUSTOM_FORBIDDEN'].find(code => error.message.includes(code))
  if (code) return complimentaryResponse({ code },403)
  if(error.message.includes('COMPLIMENTARY_POLICY_PENDING'))return complimentaryResponse({code:'COMPLIMENTARY_POLICY_PENDING'},409)
  if (error.message.includes('COMPLIMENTARY_NOT_ENABLED')) return complimentaryResponse({code:'COMPLIMENTARY_NOT_ENABLED'},404)
  if (error.message.includes('COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED')) return complimentaryResponse({code:'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'},409)
  if (/COMPLIMENTARY_(CODE_UNAVAILABLE|STATE_CONFLICT|REQUEST_CONFLICT)/.test(error.message))
    return complimentaryResponse({code:'COMPLIMENTARY_UNAVAILABLE'},409)
  return complimentaryResponse({code:'COMPLIMENTARY_UNAVAILABLE'},503)
}

/** Admission commits independently of redemption, so rejected guesses still consume quota. */
export async function admitComplimentary(subject: string) {
  const {data,error} = await supabaseAdmin({noStore:true}).rpc('native_sales_complimentary_admit', {
    p_subject:complimentaryDigest(subject),
  })
  return !error && data === true
}
export async function redeemComplimentary(authId: string, organizationId: string, body: unknown) {
  if (!complimentaryEnabled()) return complimentaryResponse({code:'NOT_FOUND'},404)
  // Count malformed attempts too; never key admission by the guessed code.
  if (!await admitComplimentary(`patient:${authId}`)) return complimentaryResponse({code:'RATE_LIMITED'},429)
  const input = codeInput.safeParse(body)
  if (!input.success) return complimentaryResponse({code:'INVALID_REQUEST'},422)
  const {data,error} = await supabaseAdmin({noStore:true}).rpc('native_sales_complimentary_redeem', {
    p_org:organizationId,p_auth:authId,p_code_hash:complimentaryDigest(input.data.code),p_preview:input.data.preview,
  })
  if(error)return complimentaryError(error)
  if(!input.data.preview&&data?.status==='ACTIVE'){const {queueComplimentaryRedemption}=await import('./complimentary-mail');await queueComplimentaryRedemption(organizationId,complimentaryDigest(input.data.code))}
  return complimentaryResponse({data})
}

/** Overlay is shared by every Patient membership read; expiry never depends on a scheduler. */
export async function complimentaryCoverage(row: {id:string;organization_id?:string;funding_type?:string;complimentary_benefit_id?:string|null;status:string;expires_at:string}, organizationId:string) {
  if (row.funding_type !== 'COMPLIMENTARY') return row
  const {data:b,error} = await supabaseAdmin({noStore:true}).from('sales_complimentary_benefits')
    .select('status,activated_at,expires_at,duration_months,payment_requirement')
    .eq('organization_id',organizationId).eq('id',row.complimentary_benefit_id ?? '').eq('membership_id',row.id).maybeSingle()
  if (error || !b) throw new Error('COMPLIMENTARY_COVERAGE_UNAVAILABLE')
  return {...row,status:b.status==='ACTIVE' && Date.parse(b.expires_at)<=Date.now() ? 'EXPIRED' : b.status,
    activated_at:b.activated_at,benefit_expires_at:b.expires_at,benefit_duration_months:b.duration_months,
    payment_requirement:b.payment_requirement,automatic_renewal:false}
}
