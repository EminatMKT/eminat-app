import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const { approvedQa, resolveMetaDeployment, requireMetaRequest } = createRequire(import.meta.url)('../../meta-qa-isolation.cjs')
const { assertDeploymentIsolation } = createRequire(import.meta.url)('../../deployment-isolation.cjs')
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const vault = Buffer.alloc(32, 8).toString('base64url')
const project = 'abcdefghijklmnopqrst'
const token = (ref: string, role: string) => `test.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.test`
const env = { VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_ENV: 'local', LILLY_ISOLATED_QA_APPROVAL_ID: 'review-fixture',
  VERCEL_PROJECT_ID: 'prj-fixture', VERCEL_ORG_ID: 'team-fixture', VERCEL_GIT_COMMIT_REF: 'qa-fixture',
  NEXT_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co`,
  SUPABASE_SECRET_KEY: token(project, 'service_role'), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: token(project, 'anon'),
  LILLY_SOCIAL_TOKEN_KEY: vault, LILLY_META_APP_ID: 'existing-app',
  LILLY_META_APP_SECRET: 'synthetic-existing-app-secret', LILLY_META_GRAPH_VERSION: 'v24.0' }
const record = { id: 'review-fixture', environment: 'preview', evidence: 'synthetic test only',
  expiresAt: '2099-01-01T00:00:00Z', vercelProjectId: 'prj-fixture', vercelOrgId: 'team-fixture', branch: 'qa-fixture',
  origin: 'https://approved-qa.example.com', forbiddenProductionOrigins: ['https://app.stratixsolutions.us', 'https://hub.eminat.net'],
  supabaseProjectRef: project, databaseKeySha256: { SUPABASE_SECRET_KEY: digest(env.SUPABASE_SECRET_KEY),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: digest(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) },
  vaultKeySha256: digest(Buffer.from(vault,'base64url')), productionVaultKeySha256: digest(Buffer.alloc(32, 9)), metaAppId: 'existing-app', metaAppSecretSha256: digest(env.LILLY_META_APP_SECRET), graphVersion: 'v24.0' }
const prod = { VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'production',
  NEXT_PUBLIC_SUPABASE_URL: 'https://ruedelunbtaomhrzgelc.supabase.co' }

describe('reviewed Meta environment isolation', () => {
  it('has zero real approvals; environment variables alone cannot approve infrastructure', () => {
    expect(() => approvedQa(env)).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    expect(() => assertDeploymentIsolation(env)).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
  })
  it('permits only the reviewed database exception and retains unrelated worker guards', () => {
    expect(() => assertDeploymentIsolation(env, [record])).not.toThrow()
    for (const name of ['CRON_SECRET','DATABASE_URL','RESEND_API_KEY','LILLY_QBO_CLIENT_SECRET','PATIENT_EMAIL_OUTBOX_KEY'])
      expect(() => assertDeploymentIsolation({ ...env, [name]: 'foreign-worker-credential' }, [record])).toThrow()
  })
  it('separates Production and explicitly reviewed QA callbacks without request input', () => {
    const qa = resolveMetaDeployment(env, [record])
    const production = resolveMetaDeployment(prod, [record])
    expect(qa.callback).toBe('https://approved-qa.example.com/api/sales-native/social/meta/callback')
    expect(production.callback).toBe('https://app.stratixsolutions.us/api/sales-native/social/meta/callback')
    expect(qa.context).not.toBe(production.context)
  })
  it.each([
    { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' }, { VERCEL_ENV: 'staging' },
    { VERCEL_TARGET_ENV: 'production' }, { NEXT_PUBLIC_APP_ENV: 'production' }, { VERCEL_PROJECT_ID: 'foreign' },
    { VERCEL_ORG_ID: 'foreign' }, { VERCEL_GIT_COMMIT_REF: 'main' }, { LILLY_META_APP_ID: 'foreign' }, { LILLY_META_APP_SECRET: 'wrong-secret' }, { LILLY_META_GRAPH_VERSION: 'v99.0' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://ruedelunbtaomhrzgelc.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co.evil.example` },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co/?redirect=production` },
    { SUPABASE_SECRET_KEY: 'sb_secret_unapproved' }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_unapproved' },
    { SUPABASE_SERVICE_ROLE_KEY: 'retained-foreign-key' }, { LILLY_SOCIAL_TOKEN_KEY: 'retained-production-key' }, { LILLY_SOCIAL_TOKEN_KEY: Buffer.alloc(32,9).toString('base64url') },
    { LILLY_META_REDIRECT_URI: 'https://app.stratixsolutions.us/api/sales-native/social/meta/callback' },
  ])('fails closed on environment, database or credential mismatch: %j', change => {
    expect(() => resolveMetaDeployment({ ...env, ...change }, [record])).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
  })
  it.each(['ref', 'role'])('rejects accidentally pinned JWTs with a wrong %s', field => {
    const bad = token(field === 'ref' ? 'ruedelunbtaomhrzgelc' : project, field === 'role' ? 'anon' : 'service_role')
    expect(() => approvedQa({ ...env, SUPABASE_SECRET_KEY: bad }, [{ ...record,
      databaseKeySha256: { ...record.databaseKeySha256, SUPABASE_SECRET_KEY: digest(bad) } }])).toThrow()
  })
  it('pins opaque keys only as an explicitly reviewed pair', () => {
    const opaque = { ...env, SUPABASE_SECRET_KEY: 'sb_secret_fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }
    expect(approvedQa(opaque, [{ ...record, databaseKeySha256: {
      SUPABASE_SECRET_KEY: digest(opaque.SUPABASE_SECRET_KEY), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: digest(opaque.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) } }])).toEqual(expect.objectContaining({ id: record.id }))
  })
  it.each([
    { origin: 'https://app.stratixsolutions.us' }, { origin: 'https://hub.eminat.net' },
    { origin: 'https://approved-qa.example.com/path' }, { origin: 'https://user@approved-qa.example.com' },
    { origin: 'http://approved-qa.example.com' }, { origin: 'https://approved-qa.example.com:8443' },
    { supabaseProjectRef: 'ruedelunbtaomhrzgelc' }, { expiresAt: '2000-01-01' },
    { productionVaultKeySha256: record.vaultKeySha256 }, { productionVaultKeySha256: '' },
  ])('rejects unsafe or expired approval: %j', change => {
    expect(() => approvedQa(env, [{ ...record, ...change }])).toThrow()
  })
  it('invalidates handoff context when the approval or credential set changes', () => {
    expect(resolveMetaDeployment(env, [record]).context).not.toBe(resolveMetaDeployment(env, [{ ...record, evidence: 'replacement review' }]).context)
  })
  it.each([
    'https://app.stratixsolutions.us/api/sales-native/social/meta/callback',
    'https://evil.example/api/sales-native/social/meta/callback',
    'https://approved-qa.example.com/api/sales-native/social/meta/callback?redirect_uri=https://evil.example',
  ])('rejects foreign origins and redirect overrides: %s', url => {
    expect(() => requireMetaRequest(new Request(url), resolveMetaDeployment(env, [record]))).toThrow('META_REQUEST_ORIGIN_INVALID')
  })
  it('ignores forged forwarded-host as a source of trust and rejects a foreign Origin', () => {
    const deployment = resolveMetaDeployment(env, [record])
    const url = deployment.callback
    expect(() => requireMetaRequest(new Request(url, { headers: { origin: 'https://evil.example' } }), deployment)).toThrow()
    expect(() => requireMetaRequest(new Request(url, { headers: { 'x-forwarded-host': 'evil.example' } }), deployment)).not.toThrow()
    expect(deployment.origin).toBe(record.origin)
  })
  it('never includes credential values in isolation errors', () => {
    try { approvedQa({ ...env, SUPABASE_SECRET_KEY: 'private-canary' }, [record]) } catch (error) {
      expect(String(error)).not.toContain('private-canary')
    }
  })
})
