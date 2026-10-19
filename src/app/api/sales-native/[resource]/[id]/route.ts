import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { isNativeCrmResource, scopedCrmRead } from '@/server/sales-native/crm-read'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const leadPatch = z.object({
  displayName: z.string().trim().min(1).max(500).optional(),
  firstName: z.string().trim().max(500).nullable().optional(),
  lastName: z.string().trim().max(500).nullable().optional(),
  companyName: z.string().trim().max(500).nullable().optional(),
  title: z.string().trim().max(500).nullable().optional(),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  website: z.url().max(2000).refine(value => ['http:', 'https:'].includes(new URL(value).protocol)).nullable().optional(),
  industry: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  source: z.string().trim().min(1).max(500).optional(),
  sourceDetail: z.string().trim().max(500).nullable().optional(),
  doNotCall: z.boolean().optional(),
  doNotEmail: z.boolean().optional(),
  nextAction: z.string().trim().max(500).nullable().optional(),
  nextFollowUpAt: z.iso.datetime({ offset: true }).nullable().optional(),
}).strict()

export async function GET(request: Request, context: { params: { resource: string; id: string } }) {
  try {
    if (!isNativeCrmResource(context.params.resource))
      return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
    if (!uuid.test(context.params.id)) return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    return scopedCrmRead(actor, context.params.resource, { id: context.params.id, limit: 1 })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

export async function PATCH(request: Request, context: { params: { resource: string; id: string } }) {
  try {
    if (context.params.resource !== 'leads') return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 })
    if (!uuid.test(context.params.id)) return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    const header = request.headers.get('if-match')
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
    const parsed = leadPatch.safeParse(payload)
    if (!parsed.success || Object.keys(parsed.data).length === 0)
      return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_update_lead', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_lead_id: context.params.id,
      p_expected_version: expectedVersion,
      p_patch: parsed.data,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
