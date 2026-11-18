import { createHash, randomUUID } from 'node:crypto'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { recoverNativeMetaLeads } from '@/server/sales-native/social/lead-recovery'
import { approvedMetaLead } from '@/server/sales-native/social/meta-lead-policy'
import { normalizeMetaWebhook } from '@/server/sales-native/social/meta-normalize'
import { verifyMetaChallenge, verifyMetaWebhookSignature } from '@/server/sales-native/social/meta-verification'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const fail = (code: string, status: number) =>
  Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  if (!nativeSalesEnabled()) return fail('NOT_FOUND', 404)
  const token = process.env.LILLY_META_VERIFY_TOKEN
  if (!token || token.length < 16) return fail('META_NOT_CONFIGURED', 503)
  const params = new URL(request.url).searchParams
  try {
    const challenge = verifyMetaChallenge(params.get('hub.mode'), params.get('hub.verify_token'),
      params.get('hub.challenge'), token)
    return new Response(challenge, { headers: { 'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store' } })
  } catch { return fail('META_CHALLENGE_DENIED', 403) }
}

export async function POST(request: Request) {
  if (!nativeSalesEnabled()) return fail('NOT_FOUND', 404)
  const secret = process.env.LILLY_META_APP_SECRET
  if (!secret || secret.length < 16) return fail('META_NOT_CONFIGURED', 503)
  const claimed = Number(request.headers.get('content-length'))
  if (Number.isFinite(claimed) && claimed > 1024 * 1024) return fail('META_PAYLOAD_INVALID', 413)
  let raw: Buffer
  try {
    const reader = request.body?.getReader()
    if (!reader) return fail('META_PAYLOAD_INVALID', 400)
    const chunks: Buffer[] = []; let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > 1024 * 1024) { await reader.cancel(); return fail('META_PAYLOAD_INVALID', 413) }
      chunks.push(Buffer.from(value))
    }
    raw = Buffer.concat(chunks)
  }
  catch { return fail('META_PAYLOAD_INVALID', 400) }
  if (!verifyMetaWebhookSignature(raw, request.headers.get('x-hub-signature-256'), secret))
    return fail('META_SIGNATURE_INVALID', 401)
  let events: ReturnType<typeof normalizeMetaWebhook>
  try { events = normalizeMetaWebhook(raw) }
  catch { return fail('META_PAYLOAD_INVALID', 422) }
  let accepted = 0; let replayed = 0; let pending = 0; let failed = 0
  for (const event of events) {
    if (!approvedMetaLead(event.externalAssetId, event.normalized.formId)) { failed++; continue }
    const hash = createHash('sha256').update(JSON.stringify(event.normalized)).digest('hex')
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_receive_social_event', {
      p_external_asset_id: event.externalAssetId,
      p_external_event_id: event.externalEventId,
      p_kind: event.kind,
      p_occurred_at: event.occurredAt,
      p_normalized: event.normalized,
      p_payload_hash: hash,
      p_correlation_id: randomUUID(),
      p_operation_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    if (data?.replayed === true) replayed++
    else if (data?.status === 'RETRY') pending++
    else if (data?.status === 'FAILED') failed++
    else if (data?.status === 'PROCESSED') accepted++
    else return fail('META_RECEIPT_INVALID', 503)
  }
  if (pending || replayed) {
    // Durable receipt already committed. Provider outages retry through the existing worker.
    try { await recoverNativeMetaLeads({ limit: 3 }) } catch { /* cron retries the durable queue */ }
  }
  return Response.json({ accepted, replayed, pending, failed },
    { headers: { 'Cache-Control': 'no-store' } })
}
