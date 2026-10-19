import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { membershipTypes, plans, saleDurations } from '@/server/sales-native/pricing'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
})
const issuance = z.object({
  paymentId: z.uuid(),
  contactId: z.uuid(),
  plan: z.enum(plans),
  membershipType: z.enum(membershipTypes),
  duration: z.enum(saleDurations),
  issuedAt: calendarDate,
  firstName: z.string().trim().min(1).max(160),
  lastName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(80),
  email: z.email().max(320),
  address: z.string().trim().min(1).max(1000),
  isDemo: z.boolean().default(false),
}).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['limit', 'offset', 'q', 'demo'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const limit = Number(params.get('limit') ?? '25')
    const offset = Number(params.get('offset') ?? '0')
    const q = params.get('q')
    const demo = params.get('demo')
    if (!Number.isSafeInteger(limit) || limit<1 || limit>100 ||
        !Number.isSafeInteger(offset) || offset<0 || offset>100000 ||
        (q !== null && q.length>160) || (demo !== null && !['true', 'false'].includes(demo)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_visible_memberships', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_limit: limit, p_offset: offset, p_q: q || null, p_id: null,
      p_demo: demo === null ? null : demo === 'true',
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0)===limit ? offset+limit : null },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

export async function POST(request: Request) {
  try {
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
    const parsed = issuance.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const body = parsed.data
    const payloadHash = createHash('sha256').update(JSON.stringify([
      body.paymentId, body.contactId, body.plan, body.membershipType,
      body.duration, body.issuedAt, body.firstName, body.lastName,
      body.phone, body.email, body.address, body.isDemo,
    ])).digest('hex')
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_issue_membership', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_payment_id: body.paymentId, p_contact_id: body.contactId,
      p_plan: body.plan, p_membership_type: body.membershipType,
      p_duration: body.duration, p_issued_at: body.issuedAt,
      p_first_name: body.firstName, p_last_name: body.lastName,
      p_phone: body.phone, p_email: body.email, p_address: body.address,
      p_is_demo: body.isDemo, p_idempotency_key: key,
      p_payload_hash: payloadHash, p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
