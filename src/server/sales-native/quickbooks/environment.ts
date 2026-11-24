import 'server-only'

export const QBO_SANDBOX_REALM = '9341458451286187'
export const QBO_SANDBOX_CALLBACK = 'https://staging.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback'
const STAGING_DATABASE = 'https://sykxgksagbhmfrzbbtfe.supabase.co'
export type QboEnvironment = 'production' | 'sandbox'

/** A deployment tier, database and explicit mode must agree before provider access. */
export function qboEnvironment(): QboEnvironment {
  const env = process.env
  if (env.NEXT_PUBLIC_APP_ENV === 'staging' || env.NEXT_PUBLIC_SUPABASE_URL === STAGING_DATABASE) {
    if (env.NEXT_PUBLIC_APP_ENV !== 'staging' || env.NEXT_PUBLIC_SUPABASE_URL !== STAGING_DATABASE ||
      env.VERCEL_ENV === 'production' || env.LILLY_QBO_ENVIRONMENT !== 'sandbox' ||
      env.LILLY_QBO_SANDBOX_REALM_ID !== QBO_SANDBOX_REALM)
      throw new Error('QBO_SANDBOX_ISOLATION_REQUIRED')
    if (['LILLY_QBO_CLIENT_ID','LILLY_QBO_CLIENT_SECRET','LILLY_QBO_TOKEN_KEY',
      'LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER'].some(key => !!env[key]))
      throw new Error('QBO_PRODUCTION_CREDENTIALS_FORBIDDEN_IN_STAGING')
    return 'sandbox'
  }
  if (env.LILLY_QBO_ENVIRONMENT && env.LILLY_QBO_ENVIRONMENT !== 'production')
    throw new Error('QBO_ENVIRONMENT_MISMATCH')
  return 'production'
}

export function qboConnectionRpc(name: string): string {
  if (qboEnvironment() === 'production') return name
  const allowed = ['claim_oauth_state','finish_oauth_state','claim_refresh','finish_refresh',
    'hold_for_revocation','disconnect']
  const suffix = name.replace(/^native_sales_qbo_/, '')
  if (!allowed.includes(suffix)) throw new Error('QBO_CONNECTION_RPC_INVALID')
  return `native_sales_qbo_sandbox_${suffix}`
}

export function qboApplicationOrigin(): string {
  return qboEnvironment() === 'sandbox' ? 'https://staging.stratixsolutions.us' : 'https://app.stratixsolutions.us'
}
