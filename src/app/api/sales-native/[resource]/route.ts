import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { isNativeCrmResource, scopedCrmRead } from '@/server/sales-native/crm-read'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

const common = {
  email: z.email().max(320).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  ownerMemberId: z.uuid().optional(),
  teamId: z.uuid().nullable().optional(),
}
const contactCreate = z.object({
  displayName: z.string().trim().min(1).max(500),
  primaryAccountId: z.uuid().nullable().optional(),
  ...common,
}).strict()
const accountCreate = z.object({
  name: z.string().trim().min(1).max(500),
  type: z.enum(['prospect', 'customer', 'partner']).default('prospect'),
  ...common,
}).strict()
const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})
const opportunityCreate = z.object({
  name: z.string().trim().min(1).max(500),
  accountId: z.uuid(),
  primaryContactId: z.uuid().nullable().optional(),
  currency: z.string().length(3).refine(value => Intl.supportedValuesOf('currency').includes(value)),
  amount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).nullable().optional(),
  expectedCloseDate: validDate,
  ownerMemberId: z.uuid().optional(),
  teamId: z.uuid().nullable().optional(),
}).strict()

export async function GET(request: Request, context: { params: { resource: string } }) {
  try {
    if (!isNativeCrmResource(context.params.resource))
      return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['q', 'limit', 'offset'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const limit = params.has('limit') ? Number(params.get('limit')) : 25
    const offset = params.has('offset') ? Number(params.get('offset')) : 0
    const q = params.get('q')?.trim() || null
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 100000 ||
        (q !== null && q.length > 200))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    return scopedCrmRead(actor, context.params.resource, { limit, offset, q })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

export async function POST(request: Request, context: { params: { resource: string } }) {
  try {
    if (!['contacts', 'accounts', 'opportunities'].includes(context.params.resource))
      return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 })
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
    if (context.params.resource === 'opportunities') {
      const parsed = opportunityCreate.safeParse(payload)
      if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
      const body = parsed.data
      const payloadHash = createHash('sha256').update(JSON.stringify([
        body.name, body.accountId, body.primaryContactId ?? null, body.currency,
        body.amount ?? null, body.expectedCloseDate, body.ownerMemberId ?? null,
        body.teamId ?? null,
      ])).digest('hex')
      const { data, error } = await supabaseAdmin().rpc('native_sales_create_opportunity', {
        p_organization_id: actor.organizationId,
        p_actor_member_id: actor.memberId,
        p_name: body.name,
        p_account_id: body.accountId,
        p_contact_id: body.primaryContactId ?? null,
        p_currency: body.currency,
        p_amount: body.amount ?? null,
        p_expected_close_date: body.expectedCloseDate,
        p_owner_member_id: body.ownerMemberId ?? null,
        p_team_id: body.teamId ?? null,
        p_idempotency_key: key,
        p_payload_hash: payloadHash,
        p_request_id: randomUUID(),
      })
      if (error) return nativeSalesDatabaseError(error)
      return Response.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    }
    const parsed = context.params.resource === 'contacts'
      ? contactCreate.safeParse(payload) : accountCreate.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const body = parsed.data
    const name = 'displayName' in body ? body.displayName : body.name
    const type = 'type' in body ? body.type : null
    const primaryAccountId = 'primaryAccountId' in body ? body.primaryAccountId ?? null : null
    const payloadHash = createHash('sha256').update(JSON.stringify([
      context.params.resource, name, body.email ?? null, body.phone ?? null,
      body.source ?? null, type, primaryAccountId, body.ownerMemberId ?? null,
      body.teamId ?? null,
    ])).digest('hex')
    const { data, error } = await supabaseAdmin().rpc('native_sales_create_directory_record', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_resource: context.params.resource,
      p_name: name,
      p_email: body.email ?? null,
      p_phone: body.phone ?? null,
      p_source: body.source ?? null,
      p_account_type: type,
      p_primary_account_id: primaryAccountId,
      p_owner_member_id: body.ownerMemberId ?? null,
      p_team_id: body.teamId ?? null,
      p_idempotency_key: key,
      p_payload_hash: payloadHash,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data, warnings: [] }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
