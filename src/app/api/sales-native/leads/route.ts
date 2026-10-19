import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { isLeadStatus } from '@/server/sales-native/lead-lifecycle'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

const createLead = z.object({
  displayName: z.string().trim().min(1).max(500),
  source: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  companyName: z.string().trim().max(500).nullable().optional(),
  ownerMemberId: z.uuid().optional(),
  teamId: z.uuid().nullable().optional(),
}).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['q', 'limit', 'offset', 'status'].includes(key)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const limit = params.has('limit') ? Number(params.get('limit')) : 25
    const offset = params.has('offset') ? Number(params.get('offset')) : 0
    const q = params.get('q')?.trim() || null
    const status = params.get('status') || null
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 100000 ||
        (q !== null && q.length > 200) || (status !== null && !isLeadStatus(status)))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_visible_leads', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_limit: limit,
      p_offset: offset,
      p_q: q,
      p_status: status,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0) === limit ? offset + limit : null },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'

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
    const parsed = createLead.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const body = parsed.data
    const payloadHash = createHash('sha256').update(JSON.stringify([
      body.displayName, body.source, body.email ?? null, body.phone ?? null,
      body.companyName ?? null, body.ownerMemberId ?? null, body.teamId ?? null,
    ])).digest('hex')
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_create_lead', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_display_name: body.displayName,
      p_source: body.source,
      p_email: body.email ?? null,
      p_phone: body.phone ?? null,
      p_company_name: body.companyName ?? null,
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
