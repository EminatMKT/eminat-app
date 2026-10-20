import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = z.uuid()
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
})
const conversion = z.object({
  accountId: uuid.optional(),
  accountName: z.string().trim().min(1).max(500).optional(),
  contactId: uuid.optional(),
  opportunity: z.object({
    name: z.string().trim().min(1).max(500),
    currency: z.string().length(3).refine(value => Intl.supportedValuesOf('currency').includes(value)),
    amount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
    expectedCloseDate: calendarDate,
  }).strict().optional(),
}).strict()

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    if (!uuid.safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    const key = request.headers.get('idempotency-key')
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      return Response.json({ code: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 })
    const header = request.headers.get('x-sales-expected-version')
    if (!header || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(header))
      return Response.json({ code: 'IF_MATCH_REQUIRED' }, { status: 428 })
    const expectedVersion = Number(header.replaceAll('"', ''))
    if (!Number.isSafeInteger(expectedVersion))
      return Response.json({ code: 'INVALID_VERSION' }, { status: 400 })
    if (Number(request.headers.get('content-length') ?? '0') > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }) }
    if (Buffer.byteLength(JSON.stringify(payload)) > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    const parsed = conversion.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const body = parsed.data
    const payloadHash = createHash('sha256').update(JSON.stringify([
      body.accountId ?? null, body.accountName ?? null, body.contactId ?? null,
      body.opportunity ?? null,
    ])).digest('hex')
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_convert_lead', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_lead_id: context.params.id, p_expected_version: expectedVersion,
      p_account_id: body.accountId ?? null, p_account_name: body.accountName ?? null,
      p_contact_id: body.contactId ?? null, p_opportunity: body.opportunity ?? null,
      p_idempotency_key: key, p_payload_hash: payloadHash, p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
