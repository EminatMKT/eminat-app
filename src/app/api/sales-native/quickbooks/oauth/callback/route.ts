import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { completeQboConnection, EMC_ORGANIZATION_ID } from
  '@/server/sales-native/quickbooks/connection'
import ssrClient from '@/shared/db/requireAccess/ssrClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const origin = 'https://app.stratixsolutions.us'
function back(result: string): Response {
  const url = new URL('/sales-native',origin)
  url.searchParams.set('qboConnection',result)
  return Response.redirect(url,303)
}

export async function GET(request: Request) {
  if (!nativeSalesEnabled()) return back('unavailable')
  const params = new URL(request.url).searchParams
  const state = params.get('state') ?? ''
  const code = params.get('code') ?? ''
  const realmId = params.get('realmId') ?? ''
  if (!state || !code || !realmId || params.has('error')) return back('denied')
  const client = ssrClient()
  const { data: { session } } = await client.auth.getSession()
  if (!session?.access_token) return back('authentication_required')
  const actorRequest = new Request(request.url, { headers: {
    Authorization: `Bearer ${session.access_token}`,
    'X-Sales-Organization-Id': EMC_ORGANIZATION_ID,
  } })
  try {
    await completeQboConnection(actorRequest,{ state,code,realmId })
    return back('connected')
  } catch { return back('unavailable') }
}
