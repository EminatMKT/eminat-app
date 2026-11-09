import { NativeSalesAuthError } from '@/server/sales-native/auth'
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

const vaultErrors = new Set([
  'QBO_VAULT_UNAVAILABLE','QBO_VAULT_CONTEXT_INVALID','QBO_TOKEN_INVALID',
])
function safeFailureCode(error: unknown): string {
  if (error instanceof NativeSalesAuthError) return error.code
  if (error instanceof Error && vaultErrors.has(error.message)) return error.message
  return 'QBO_CALLBACK_UNEXPECTED'
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
  } catch (error) {
    // Log only a fixed diagnostic code; never log the request, grant code or tokens.
    console.error('QBO_OAUTH_CALLBACK_FAILED', safeFailureCode(error))
    return back('unavailable')
  }
}
