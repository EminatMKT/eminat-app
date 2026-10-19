import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const decision = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).strict()

export async function POST(request: Request, context: { params: { id: string; requestId: string } }) {
  try {
    if (!z.uuid().safeParse(context.params.id).success ||
        !z.uuid().safeParse(context.params.requestId).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    if (Number(request.headers.get('content-length') ?? '0') > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }) }
    if (Buffer.byteLength(JSON.stringify(payload)) > 32768)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    const parsed = decision.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_review_family_member', {
      p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      p_membership_id: context.params.id, p_family_request_id: context.params.requestId,
      p_decision: parsed.data.status, p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
