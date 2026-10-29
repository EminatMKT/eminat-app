import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { openSocialToken } from './token-vault'
import { allowMetaLeadFields, approvedMetaLead, EMC_META_LEAD_POLICY } from './meta-lead-policy'

const jobSchema = z.object({
  receiptId: z.uuid(), organizationId: z.uuid(), integrationId: z.uuid(),
  externalLeadId: z.string().regex(/^[0-9]{1,30}$/),
  pageId: z.string(), formId: z.string(),
  tokenCiphertext: z.string().min(1).nullable(),
  tokenExpiresAt: z.iso.datetime({ offset: true }).nullable(),
})
const leadSchema = z.object({
  id: z.string().min(1).max(200), form_id: z.string(),
  created_time: z.string().optional(), ad_id: z.string().optional(),
  campaign_id: z.string().optional(), adset_id: z.string().optional(),
  platform: z.string().optional(),
  field_data: z.array(z.object({
    name: z.string().min(1).max(200),
    values: z.array(z.union([z.string(), z.number(), z.boolean()])).max(20),
  })).min(1).max(100),
})

export function metaGraphVersion(env: Record<string, string | undefined> = process.env): string | null {
  const version = env.LILLY_META_GRAPH_VERSION ?? ''
  return /^v\d{1,2}\.\d{1,2}$/.test(version) ? version : null
}

export async function fetchMetaLeadFields(id: string, token: string, version: string,
  request: typeof fetch = fetch, expectedFormId: string = EMC_META_LEAD_POLICY.formIds[0]): Promise<Record<string, string>> {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id) || !token || !/^v\d{1,2}\.\d{1,2}$/.test(version))
    throw new Error('META_LEAD_INVALID')
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}`)
  url.searchParams.set('fields', 'id,form_id,created_time,ad_id,campaign_id,adset_id,platform,field_data')
  let response: Response
  try {
    response = await request(url, { headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  } catch { throw new Error('META_LEAD_FETCH_FAILED') }
  if (!response.ok) throw new Error('META_LEAD_FETCH_FAILED')
  const size = Number(response.headers.get('content-length'))
  if (Number.isFinite(size) && size > 256 * 1024) throw new Error('META_LEAD_INVALID')
  let decoded: unknown
  try {
    const reader = response.body?.getReader()
    if (!reader) throw new Error()
    const chunks: Uint8Array[] = []; let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > 256 * 1024) { await reader.cancel(); throw new Error() }
      chunks.push(value)
    }
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
    decoded = JSON.parse(bytes.toString('utf8'))
  }
  catch { throw new Error('META_LEAD_INVALID') }
  const parsed = leadSchema.safeParse(decoded)
  if (!parsed.success || parsed.data.id !== id || parsed.data.form_id !== expectedFormId) throw new Error('META_LEAD_INVALID')
  const fields = allowMetaLeadFields(Object.fromEntries(parsed.data.field_data.map(field =>
    [field.name, String(field.values[0] ?? '').slice(0, 10000)])))
  // Only fixed keys/IDs cross the RPC; provider answers discarded above.
  fields._form_id = parsed.data.form_id
  for (const name of ['ad_id', 'campaign_id', 'adset_id'] as const) {
    const value = parsed.data[name]
    if (value && /^[0-9]{1,30}$/.test(value)) fields[`_${name}`] = value
  }
  if (['fb', 'ig'].includes(parsed.data.platform ?? '')) fields._platform = parsed.data.platform!
  if (parsed.data.field_data.some(field => !['first_name', 'last_name', 'full_name',
    'email', 'phone_number', 'preferred_language'].includes(field.name))) fields._fields_blocked = 'true'
  return fields
}

export async function recoverNativeMetaLeads(options: {
  limit?: number;
  db?: ReturnType<typeof supabaseAdmin>;
  fetchFields?: typeof fetchMetaLeadFields;
  env?: Record<string, string | undefined>;
} = {}) {
  const env = options.env ?? process.env
  const version = metaGraphVersion(env)
  const vaultKey = env.LILLY_SOCIAL_TOKEN_KEY
  if (!version || !vaultKey) return { processed: 0, recovered: 0, failed: 0,
    reason: 'META_RECOVERY_NOT_CONFIGURED' }
  const db = options.db ?? supabaseAdmin({ noStore: true })
  const { data, error } = await db.rpc('native_sales_claim_social_leads', { p_limit: options.limit ?? 10 })
  if (error) throw new Error('META_RETRY_CLAIM_FAILED')
  let recovered = 0; let failed = 0; let deferred = 0
  for (const raw of data ?? []) {
    const parsed = jobSchema.safeParse(raw)
    if (!parsed.success) throw new Error('META_RETRY_JOB_INVALID')
    const job = parsed.data
    let code: 'META_TOKEN_UNAVAILABLE' | 'META_LEAD_FETCH_FAILED' | 'META_LEAD_INVALID' =
      'META_TOKEN_UNAVAILABLE'
    try {
      if (job.organizationId !== EMC_META_LEAD_POLICY.organizationId || !approvedMetaLead(job.pageId, job.formId)) {
        code = 'META_LEAD_INVALID'; throw new Error(code)
      }
      if (!job.tokenCiphertext || job.tokenExpiresAt &&
        Date.parse(job.tokenExpiresAt) <= Date.now() + 60_000) throw new Error(code)
      const token = openSocialToken(job.tokenCiphertext, vaultKey,
        job.organizationId, job.integrationId)
      const fields = await (options.fetchFields ?? fetchMetaLeadFields)(job.externalLeadId,
        token, version, undefined, job.formId)
      const { data: result, error: retryError } = await db.rpc('native_sales_retry_social_lead', {
        p_receipt_id: job.receiptId, p_fields: fields,
      })
      if (retryError || !result || typeof result !== 'object') {
        code = 'META_LEAD_INVALID'
        throw new Error(code)
      }
      if (result.status === 'PROCESSED') recovered++
      else if (result.status === 'RETRY' || result.status === 'FAILED') deferred++
      else throw new Error('META_LEAD_INVALID')
      continue
    } catch (error) {
      if (error instanceof Error &&
        ['META_LEAD_FETCH_FAILED', 'META_LEAD_INVALID'].includes(error.message))
        code = error.message as typeof code
    }
    const { error: finishError } = await db.rpc('native_sales_fail_social_lead', {
      p_receipt_id: job.receiptId, p_error_code: code,
    })
    if (finishError) throw new Error('META_RETRY_OUTCOME_NOT_RECORDED')
    failed++
  }
  return { processed: recovered + failed + deferred, recovered, failed, deferred,
    reason: failed || deferred ? 'REVIEW_REQUIRED' : null }
}
