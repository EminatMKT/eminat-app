import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { revokeMetaConnection } from '@/server/sales-native/social/meta-connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (Number(request.headers.get('content-length') ?? 0) > 2048)
      return Response.json({ code: 'META_CONNECTION_INVALID' }, { status: 413 })
    let payload: unknown
    try { payload = await request.json() }
    catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }) }
    if (Buffer.byteLength(JSON.stringify(payload)) > 2048)
      return Response.json({ code: 'META_CONNECTION_INVALID' }, { status: 413 })
    const data = await revokeMetaConnection(actor, payload)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
