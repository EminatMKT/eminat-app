import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { isNativeCrmResource, scopedCrmRead } from '@/server/sales-native/crm-read'

export const dynamic = 'force-dynamic'

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
