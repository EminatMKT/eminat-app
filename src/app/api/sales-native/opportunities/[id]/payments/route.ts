import { randomUUID } from 'node:crypto'
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
const payment = z.object({
  amount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).refine(value => Number(value) > 0),
  currency: z.string().length(3).refine(value => Intl.supportedValuesOf('currency').includes(value)),
  paidAt: calendarDate,
  reference: z.string().trim().max(200).optional(),
}).strict()

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    if (!uuid.safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    const key = request.headers.get('idempotency-key')
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      return Response.json({ code: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 })
    if (Number(request.headers.get('content-length') ?? '0') > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }) }
    if (Buffer.byteLength(JSON.stringify(payload)) > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    const parsed = payment.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_record_payment_evidence', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_opportunity_id: context.params.id, p_amount: parsed.data.amount,
      p_currency: parsed.data.currency, p_paid_at: parsed.data.paidAt,
      p_reference: parsed.data.reference ?? null, p_idempotency_key: key,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
