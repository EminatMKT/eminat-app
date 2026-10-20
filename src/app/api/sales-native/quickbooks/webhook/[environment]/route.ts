import { createHash } from 'node:crypto'
import { parseIntuitWebhook, verifyIntuitSignature,
  type QboWebhookEntity } from '@/server/sales-native/quickbooks/webhook'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

/** Signature-verified event queue only. No webhook directly mutates accounting rows. */
export async function POST(request: Request, context: { params: { environment: string } }) {
  const environment = context.params.environment
  if (environment !== 'sandbox' && environment !== 'production')
    return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  const verifier = environment === 'production'
    ? process.env.LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER
    : process.env.LILLY_QBO_SANDBOX_WEBHOOK_VERIFIER
  if (!verifier) return Response.json({ code: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 })
  if (Number(request.headers.get('content-length') ?? '0') > 262_144)
    return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
  const body = Buffer.from(await request.arrayBuffer())
  if (body.length > 262_144) return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
  if (!verifyIntuitSignature(body, request.headers.get('intuit-signature'), verifier))
    return Response.json({ code: 'WEBHOOK_SIGNATURE_INVALID' }, { status: 401 })
  let entities: QboWebhookEntity[]
  try { entities = parseIntuitWebhook(JSON.parse(body.toString('utf8')) as unknown) }
  catch { return Response.json({ code: 'WEBHOOK_INVALID' }, { status: 400 }) }
  const db = supabaseAdmin({ noStore: true })
  const organizations = new Map<string, string>()
  for (const realmId of Array.from(new Set(entities.map(entity => entity.realmId)))) {
    const { data: connection, error: connectionError } = await db.from('sales_qbo_connections')
      .select('organization_id').eq('environment', environment)
      .eq('realm_id', realmId).eq('status', 'CONNECTED').maybeSingle()
    if (connectionError) return Response.json({ code: 'WEBHOOK_UNAVAILABLE' }, { status: 503 })
    if (!connection) return Response.json({ code: 'WEBHOOK_REALM_UNKNOWN' }, { status: 403 })
    organizations.set(realmId, connection.organization_id)
  }
  for (const entity of entities) {
    const fingerprint = createHash('sha256').update(JSON.stringify([
      entity.realmId, entity.name, entity.id, entity.operation, entity.lastUpdated,
    ])).digest('hex')
    const { error } = await db.from('sales_qbo_webhook_events').insert({
      organization_id: organizations.get(entity.realmId), environment, realm_id: entity.realmId,
      event_fingerprint: fingerprint, entity_type: entity.name, entity_id: entity.id,
      operation: entity.operation,
    })
    if (error && error.code !== '23505')
      return Response.json({ code: 'WEBHOOK_UNAVAILABLE' }, { status: 503 })
  }
  return Response.json({ accepted: true }, { status: 200 })
}
