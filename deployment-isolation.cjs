const PRODUCTION_PROJECT = 'ruedelunbtaomhrzgelc'
const SUPABASE_PREVIEW_KEYS = ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const PRODUCTION_ONLY = [
  'LILLY_QBO_CLIENT_ID', 'LILLY_QBO_CLIENT_SECRET', 'LILLY_QBO_TOKEN_KEY',
  'LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER', 'LILLY_QBO_RECONCILE_WORKER_SECRET',
  'PATIENT_EMAIL_OUTBOX_KEY', 'CRON_SECRET', 'MEETINGS_MAIL_RECONCILE',
  'DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING',
  'LILLY_SALES_SCHEMA_ADMIN_DB_URL',
]

function dummy(value) {
  return ['dummy-service-role-key', 'dummy-anon-key', 're_dummy_key'].includes(value)
}

/** A caller-controlled application tier cannot authorize a Vercel Preview to use Production. */
function assertDeploymentIsolation(env) {
  if (!['preview', 'development'].includes(env.VERCEL_ENV)) return
  const reject = () => { throw new Error('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED') }
  if (env.NEXT_PUBLIC_APP_ENV === 'production') reject()
  let host = ''
  try { host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname } catch { reject() }
  if (host.includes(PRODUCTION_PROJECT)) reject()
  for (const key of SUPABASE_PREVIEW_KEYS) {
    const value = env[key]
    if (value && !dummy(value)) reject()
  }
  // Preview uses synthetic fixtures, never a mail, accounting or database worker credential.
  for (const key of [...PRODUCTION_ONLY, 'RESEND_API_KEY']) {
    if (env[key] && !dummy(env[key])) reject()
  }
}

module.exports = { assertDeploymentIsolation }
