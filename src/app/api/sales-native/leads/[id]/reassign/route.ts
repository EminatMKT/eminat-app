import { randomUUID } from 'node:crypto'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await resolveSalesActor(request)
    if (!uuid.test(context.params.id)) return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const header = request.headers.get('x-sales-expected-version')
    if (!header || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(header))
      return Response.json({ code: 'IF_MATCH_REQUIRED' }, { status: 428 })
    const expectedVersion = Number(header.replaceAll('"', ''))
    if (!Number.isSafeInteger(expectedVersion))
      return Response.json({ code: 'INVALID_VERSION' }, { status: 400 })
    let payload: unknown
    try { payload = await request.json() } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }) }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).some(key => !['ownerMemberId', 'teamId'].includes(key)) ||
        !uuid.test((payload as { ownerMemberId?: string }).ownerMemberId ?? '') ||
        (payload as { teamId?: unknown }).teamId !== null &&
          !uuid.test(String((payload as { teamId?: unknown }).teamId)))
      return Response.json({ code: 'INVALID_BODY' }, { status: 400 })
    const body = payload as { ownerMemberId: string; teamId: string | null }
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_reassign_lead', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_lead_id: context.params.id,
      p_expected_version: expectedVersion,
      p_owner_member_id: body.ownerMemberId,
      p_team_id: body.teamId,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
