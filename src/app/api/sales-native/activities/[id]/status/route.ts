import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const bodySchema = z.object({ status: z.enum(['COMPLETED','CANCELLED']) }).strict()

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await resolveSalesActor(request)
    if (!z.uuid().safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const match = request.headers.get('x-sales-expected-version')
    if (!match || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(match))
      return Response.json({ code: 'IF_MATCH_REQUIRED' }, { status: 428 })
    const expectedVersion = Number(match.replaceAll('"',''))
    if (!Number.isSafeInteger(expectedVersion))
      return Response.json({ code: 'INVALID_VERSION' }, { status: 400 })
    if (Number(request.headers.get('content-length') ?? '0')>2048)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() } catch {
      return Response.json({ code: 'INVALID_JSON' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_set_activity_status', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_activity_id: context.params.id,
      p_expected_version: expectedVersion,
      p_status: parsed.data.status,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
