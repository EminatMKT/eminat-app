import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = z.uuid()
const bodySchema = z.object({ reason: z.string().trim().min(1).max(1000), restore: z.boolean().default(false) }).strict()

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await resolveSalesActor(request)
    if (!uuid.safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const match = request.headers.get('if-match')
    if (!match || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(match))
      return Response.json({ code: 'IF_MATCH_REQUIRED' }, { status: 428 })
    const expectedVersion = Number(match.replaceAll('"', ''))
    if (!Number.isSafeInteger(expectedVersion))
      return Response.json({ code: 'INVALID_VERSION' }, { status: 400 })
    if (Number(request.headers.get('content-length') ?? '0') > 4096)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() } catch {
      return Response.json({ code: 'INVALID_JSON' }, { status: 400 })
    }
    if (Buffer.byteLength(JSON.stringify(payload)) > 4096)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413 })
    const parsed = bodySchema.safeParse(payload)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_archive_lead', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_lead_id: context.params.id,
      p_expected_version: expectedVersion,
      p_reason: parsed.data.reason,
      p_restore: parsed.data.restore,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
