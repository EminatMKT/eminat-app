import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

const leadSchema = z.object({
  id: z.string().min(1).max(200),
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
  request: typeof fetch = fetch): Promise<Record<string, string>> {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id) || !token || !/^v\d{1,2}\.\d{1,2}$/.test(version))
    throw new Error('META_LEAD_INVALID')
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}`)
  url.searchParams.set('fields', 'id,field_data')
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
  if (!parsed.success || parsed.data.id !== id) throw new Error('META_LEAD_INVALID')
  return Object.fromEntries(parsed.data.field_data.map(field =>
    [field.name, String(field.values[0] ?? '').slice(0, 10000)]))
}

export async function recoverNativeMetaLeads(options: {
  db?: ReturnType<typeof supabaseAdmin>;
  fetchFields?: typeof fetchMetaLeadFields;
  env?: Record<string, string | undefined>;
} = {}) {
  void options
  return { processed: 0, recovered: 0, failed: 0, deferred: 0, reason: 'META_INGESTION_DISABLED' }
}
