import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { exchangeMetaConnection } from '@/server/sales-native/social/meta-connection'
import ssrClient from '@/shared/db/requireAccess/ssrClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const origin = 'https://app.stratixsolutions.us'
function back(reason: string, state?: string): Response {
  const url = new URL('/sales-native', origin)
  url.searchParams.set('metaError', reason)
  if (state && /^[A-Za-z0-9_-]{40,100}$/.test(state)) url.searchParams.set('metaState', state)
  return Response.redirect(url, 303)
}

export async function GET(request: Request) {
  if (!nativeSalesEnabled()) return back('META_NOT_ACTIVE')
  const params = new URL(request.url).searchParams
  const state = params.get('state') ?? ''
  const code = params.get('code') ?? ''
  if (!state || !code || params.has('error')) return back('META_AUTHORIZATION_DENIED')
  const client = ssrClient()
  const { data: { session } } = await client.auth.getSession()
  if (!session?.access_token) return back('AUTHENTICATION_REQUIRED')
  try {
    await exchangeMetaConnection(state, code, session.access_token)
    const url = new URL('/sales-native', origin)
    url.searchParams.set('metaState', state)
    return Response.redirect(url, 303)
  } catch { return back('META_CONNECTION_UNAVAILABLE') }
}
