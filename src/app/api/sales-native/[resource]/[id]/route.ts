import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { isNativeCrmResource, scopedCrmRead } from '@/server/sales-native/crm-read'

export const dynamic = 'force-dynamic'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: Request, context: { params: { resource: string; id: string } }) {
  try {
    if (!isNativeCrmResource(context.params.resource))
      return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
    if (!uuid.test(context.params.id)) return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const actor = await resolveSalesActor(request)
    return scopedCrmRead(actor, context.params.resource, { id: context.params.id, limit: 1 })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
