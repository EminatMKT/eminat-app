const { createHash } = require('node:crypto')
const approvals = require('./docs/operations/meta-qa-approvals.json')
const PRODUCTION_PROJECT = 'ruedelunbtaomhrzgelc'
const PRODUCTION_ORIGIN = 'https://app.stratixsolutions.us'
const CALLBACK_PATH = '/api/sales-native/social/meta/callback'
const DATABASE_KEYS = ['SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const sha256 = value => createHash('sha256').update(value).digest('hex')
const reject = () => { throw new Error('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED') }
const fingerprint = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

/** Review-owned allowlist, never populated from request headers, env JSON or discovery. */
function approvedQa(env, records = approvals) {
  const id = env.LILLY_ISOLATED_QA_APPROVAL_ID
  if (!id) return null
  const matches = records.filter(record => record.id === id)
  if (matches.length !== 1) reject()
  const record = matches[0]
  if (env.VERCEL_ENV !== 'preview' || record.environment !== 'preview' ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'preview') ||
      env.NEXT_PUBLIC_APP_ENV !== 'local' ||
      !record.evidence || !Number.isFinite(Date.parse(record.expiresAt)) || Date.parse(record.expiresAt) <= Date.now() ||
      !record.vercelProjectId || env.VERCEL_PROJECT_ID !== record.vercelProjectId ||
      !record.vercelOrgId || env.VERCEL_ORG_ID !== record.vercelOrgId ||
      !record.branch || env.VERCEL_GIT_COMMIT_REF !== record.branch ||
      !/^[a-z0-9]{20}$/.test(record.supabaseProjectRef) || record.supabaseProjectRef === PRODUCTION_PROJECT) reject()
  let origin, database
  try { origin = new URL(record.origin); database = new URL(env.NEXT_PUBLIC_SUPABASE_URL) } catch { reject() }
  if (origin.protocol !== 'https:' || origin.origin !== record.origin || origin.username || origin.password ||
      origin.port || !origin.hostname.includes('.') || origin.hostname.endsWith('.supabase.co') ||
      origin.origin === PRODUCTION_ORIGIN || origin.hostname === 'hub.eminat.net' ||
      !Array.isArray(record.forbiddenProductionOrigins) || !record.forbiddenProductionOrigins.includes(PRODUCTION_ORIGIN) ||
      record.forbiddenProductionOrigins.includes(origin.origin) ||
      database.href !== `https://${record.supabaseProjectRef}.supabase.co/`) reject()
  if (!record.databaseKeySha256 || !env.SUPABASE_SECRET_KEY || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) reject()
  for (const name of DATABASE_KEYS) {
    const value = env[name]
    if (!value) continue
    if (!fingerprint(record.databaseKeySha256[name]) || sha256(value) !== record.databaseKeySha256[name]) reject()
    // A reviewed fingerprint pins opaque keys to the verified isolated project. For
    // legacy JWTs, also reject foreign project/role claims, even if accidentally pinned.
    const role = name.includes('PUBLIC') ? 'anon' : 'service_role'
    if (value.split('.').length === 3) {
      let payload
      try { payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()) } catch { reject() }
      if (payload.ref !== record.supabaseProjectRef || payload.role !== role ||
          (payload.exp && payload.exp * 1000 <= Date.now())) reject()
    } else if (!value.startsWith(role === 'anon' ? 'sb_publishable_' : 'sb_secret_')) reject()
  }
  const vault = env.LILLY_SOCIAL_TOKEN_KEY
  if (!vault || !/^[A-Za-z0-9_-]{43}$/.test(vault) || Buffer.from(vault, 'base64url').length !== 32 || Buffer.from(vault, 'base64url').toString('base64url') !== vault ||
      !fingerprint(record.vaultKeySha256) || !fingerprint(record.productionVaultKeySha256) ||
      record.vaultKeySha256 === record.productionVaultKeySha256 || sha256(Buffer.from(vault, 'base64url')) !== record.vaultKeySha256 ||
      !record.metaAppId || env.LILLY_META_APP_ID !== record.metaAppId ||
      !fingerprint(record.metaAppSecretSha256) || !env.LILLY_META_APP_SECRET || sha256(env.LILLY_META_APP_SECRET) !== record.metaAppSecretSha256 ||
      !/^v\d{1,2}\.\d{1,2}$/.test(record.graphVersion) || env.LILLY_META_GRAPH_VERSION !== record.graphVersion) reject()
  return record
}

function resolveMetaDeployment(env, records = approvals) {
  if (env.LILLY_META_REDIRECT_URI || env.LILLY_META_CALLBACK_URL) reject()
  const record = approvedQa(env, records)
  if (record) return { environment: 'isolated-qa', origin: record.origin,
    callback: record.origin + CALLBACK_PATH, context: sha256(JSON.stringify(record)) }
  if (env.VERCEL_ENV === 'production' && !env.LILLY_ISOLATED_QA_APPROVAL_ID) {
    if (env.NEXT_PUBLIC_APP_ENV !== 'production' || env.NEXT_PUBLIC_SUPABASE_URL !== `https://${PRODUCTION_PROJECT}.supabase.co`) reject()
    return { environment: 'production', origin: PRODUCTION_ORIGIN, callback: PRODUCTION_ORIGIN + CALLBACK_PATH,
      context: sha256(JSON.stringify(['production', env.NEXT_PUBLIC_SUPABASE_URL, env.LILLY_META_APP_ID,
        env.LILLY_SOCIAL_TOKEN_KEY ? sha256(env.LILLY_SOCIAL_TOKEN_KEY) : null])) }
  }
  // Unit tests have no live provider credentials; browser fixtures mock Social APIs.
  if (!env.VERCEL_ENV && env.NODE_ENV === 'test' && env.LILLY_META_APP_ID === 'synthetic-app' &&
      env.LILLY_META_APP_SECRET === 'synthetic-secret-only-123456')
    return { environment: 'synthetic', origin: 'http://localhost:3110',
      callback: 'http://localhost:3110' + CALLBACK_PATH, context: 'synthetic-only-v2' }
  reject()
}

/** Incoming URL is a constraint, never the source of callback or redirect origin. */
function requireMetaRequest(request, deployment) {
  const url = new URL(request.url)
  if (url.origin !== deployment.origin || url.username || url.password ||
      ['redirect_uri', 'redirect', 'callback', 'returnTo', 'origin'].some(key => url.searchParams.has(key)))
    throw new Error('META_REQUEST_ORIGIN_INVALID')
  const suppliedOrigin = request.headers.get('origin')
  if (suppliedOrigin && suppliedOrigin !== deployment.origin) throw new Error('META_REQUEST_ORIGIN_INVALID')
}
module.exports = { approvedQa, resolveMetaDeployment, requireMetaRequest }
