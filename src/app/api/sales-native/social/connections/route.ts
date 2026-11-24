import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { listMetaConnections } from '@/server/sales-native/social/meta-connection'
export const dynamic = 'force-dynamic'
/** Metadata-only projection. Company filtering is mandatory even for Sales administrators. */
export async function GET(request: Request) {
  try {
    const data = await listMetaConnections(await resolveSalesActor(request))
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
