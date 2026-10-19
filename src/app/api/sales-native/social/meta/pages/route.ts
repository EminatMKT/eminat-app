import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { listMetaGrantPages } from '@/server/sales-native/social/meta-connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const state = new URL(request.url).searchParams.get('state') ?? ''
    const data = await listMetaGrantPages(actor, state)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
