import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { verifyMetaChallenge, verifyMetaWebhookSignature } from '@/server/sales-native/social/meta-verification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  return fail('META_INGESTION_DISABLED', 503)
}
