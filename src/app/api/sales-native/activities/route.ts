import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { isNativeCrmResource } from '@/server/sales-native/crm-read'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = z.uuid()
const activityCreate = z.object({
  resource: z.enum(['leads', 'contacts', 'accounts', 'opportunities']),
  recordId: uuid,
  kind: z.enum(['NOTE', 'TASK', 'CALL_ATTEMPT', 'MEETING', 'FOLLOW_UP']),
  title: z.string().trim().min(1).max(240),
  body: z.string().trim().max(20000).nullable().optional(),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  assigneeMemberId: uuid.optional(),
}).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['resource', 'recordId', 'limit', 'offset'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const resource = params.get('resource') ?? ''
    const recordId = params.get('recordId') ?? ''
    const limit = Number(params.get('limit') ?? '25')
    const offset = Number(params.get('offset') ?? '0')
    if (!isNativeCrmResource(resource) || !uuid.safeParse(recordId).success ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_list_activities', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_resource: resource, p_record_id: recordId, p_limit: limit, p_offset: offset,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0) === limit ? offset + limit : null },
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
    const parsed = activityCreate.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const body = parsed.data
    const payloadHash = createHash('sha256').update(JSON.stringify([
      body.resource, body.recordId, body.kind, body.title, body.body ?? null,
      body.dueAt ?? null, body.assigneeMemberId ?? null,
    ])).digest('hex')
    const { data, error } = await supabaseAdmin().rpc('native_sales_create_activity', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_resource: body.resource, p_record_id: body.recordId,
      p_kind: body.kind, p_title: body.title, p_body: body.body ?? null,
      p_due_at: body.dueAt ?? null, p_assignee_member_id: body.assigneeMemberId ?? null,
      p_idempotency_key: key, p_payload_hash: payloadHash, p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
