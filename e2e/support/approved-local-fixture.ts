// These are Supabase's PUBLIC, deterministic disposable-local demo bindings, not secrets.
// Arbitrary loopback ports, forwarded remote projects and real service keys are not approved.
export const LOCAL_DATABASE = 'http://127.0.0.1:54321'
export const LOCAL_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
export const LOCAL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export type LocalFixtureEnvironment = Record<string, string | undefined>
export type FixtureTransport = (input: string | URL, init?: RequestInit) => Promise<Response>
const reject = (): never => { throw new Error('LOCAL_FIXTURE_NOT_APPROVED') }
const backupNames = ['native_sales_claim_social_leads', 'native_sales_receive_social_event', 'native_sales_retry_social_lead']

function configuration(env: LocalFixtureEnvironment, app: string | undefined) {
  if (env.NEXT_PUBLIC_APP_ENV !== 'local' || env.NEXT_PUBLIC_SUPABASE_URL !== LOCAL_DATABASE ||
      env.SUPABASE_SECRET_KEY !== LOCAL_SERVICE || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== LOCAL_ANON ||
      !['http://localhost:3000', 'http://127.0.0.1:3000'].includes(app ?? '') ||
      env.NODE_ENV === 'production' || env.VERCEL_ENV || env.VERCEL_TARGET_ENV ||
      (env.SUPABASE_SERVICE_ROLE_KEY !== undefined && env.SUPABASE_SERVICE_ROLE_KEY !== LOCAL_SERVICE) ||
      (env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== LOCAL_ANON) ||
      ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING',
        'LILLY_SALES_SCHEMA_ADMIN_DB_URL', 'LILLY_ISOLATED_QA_APPROVAL_ID'].some(key => env[key] !== undefined)) reject()
  return Object.freeze({ database: LOCAL_DATABASE, service: LOCAL_SERVICE, app })
}

/** No approval flag from env/caller. Approval requires the pinned demo configuration AND
 * a successful read-only authenticated probe of the actual local Phase 1 schema. */
export function createApprovedLocalFixture(
  environment: () => LocalFixtureEnvironment,
  application: () => string | undefined,
  transport: FixtureTransport = fetch,
) {
  let approved: ReturnType<typeof configuration> | undefined
  let mutated = false
  const current = () => {
    try { return configuration(environment(), application()) }
    catch { approved = undefined; return reject() }
  }
  const requireApproval = () => {
    const config = current()
    if (!approved || approved.app !== config.app || approved.database !== config.database ||
        approved.service !== config.service) return reject()
    return config
  }
  const headers = () => ({ apikey: LOCAL_SERVICE, Authorization: `Bearer ${LOCAL_SERVICE}`, 'Content-Type': 'application/json' })
  return {
    async approve() {
      const config = current()
      if (approved && approved.app === config.app) return
      approved = undefined
      try {
        const response = await transport(`${config.database}/rest/v1/sales_social_phase1_rpc_backup?select=name`, {
          headers: headers(), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) return reject()
        const rows: unknown = await response.json()
        if (!Array.isArray(rows) || rows.length !== backupNames.length ||
            JSON.stringify(rows.map(row => row?.name).sort()) !== JSON.stringify(backupNames)) return reject()
        const checked = current()
        if (checked.app !== config.app) return reject()
        approved = checked
      } catch { approved = undefined; return reject() }
    },
    /** Used at teardown entry, independently of whether beforeAll completed. Every
     * request below still rechecks approval, binding equality, URL and credentials. */
    cleanupAllowed() {
      try { requireApproval(); return mutated }
      catch { return false }
    },
    async request(path: string, init: RequestInit = {}) {
      const config = requireApproval()
      let url: URL
      try { url = new URL(path, config.database) } catch { return reject() }
      if (url.origin !== config.database || url.username || url.password || url.hash ||
          !['/rest/v1/', '/auth/v1/'].some(prefix => url.pathname.startsWith(prefix))) return reject()
      const supplied = new Headers(init.headers)
      if ((supplied.has('apikey') && supplied.get('apikey') !== LOCAL_SERVICE) ||
          (supplied.has('authorization') && supplied.get('authorization') !== `Bearer ${LOCAL_SERVICE}`)) return reject()
      const method = (init.method ?? 'GET').toUpperCase()
      if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return reject()
      for (const [key, value] of Object.entries(headers())) supplied.set(key, value)
      // Recheck immediately at the destructive transport boundary; redirects can never
      // forward even demo credentials or mutations to another target.
      requireApproval()
      if (!['GET', 'HEAD'].includes(method)) mutated = true
      return transport(url, { ...init, method, headers: supplied, redirect: 'error',
        cache: 'no-store', signal: AbortSignal.timeout(10000) })
    },
    assertApproved() { requireApproval() },
  }
}
export type ApprovedLocalFixture = ReturnType<typeof createApprovedLocalFixture>

/** Shared by the actual afterAll hook and negative setup-failure regressions. */
export async function cleanupApprovedMetaFixture(client: ApprovedLocalFixture, work: () => Promise<void>) {
  if (!client.cleanupAllowed()) return
  await work()
}
