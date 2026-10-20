import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
})
const transition = z.object({
  stageCode: z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','PAYMENT_PENDING','WON','LOST']),
  amount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).nullable().optional(),
  currency: z.string().length(3).refine(value => Intl.supportedValuesOf('currency').includes(value)).optional(),
  actualCloseDate: calendarDate.nullable().optional(),
  lostReason: z.string().trim().max(10000).nullable().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
}).strict()

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    if (!uuid.test(context.params.id)) return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
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
    const parsed = transition.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_transition_opportunity', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_opportunity_id: context.params.id,
      p_expected_version: expectedVersion,
      p_payload: parsed.data,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
