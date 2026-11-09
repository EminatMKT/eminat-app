import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
const { assertDeploymentIsolation } = createRequire(import.meta.url)('../../deployment-isolation.cjs')

const preview = {
  VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_ENV: 'local',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'dummy-service-role-key', RESEND_API_KEY: 're_dummy_key',
}

describe('deployment credential isolation', () => {
  it('allows fixture-only protected Preview and ordinary local tests', () => {
    expect(() => assertDeploymentIsolation(preview)).not.toThrow()
    expect(() => assertDeploymentIsolation({ NODE_ENV: 'test' })).not.toThrow()
  })
  it('cannot be bypassed by labeling Preview as Production', () => {
    expect(() => assertDeploymentIsolation({ ...preview, NEXT_PUBLIC_APP_ENV: 'production' })).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    expect(() => assertDeploymentIsolation({ ...preview, NEXT_PUBLIC_SUPABASE_URL: 'https://ruedelunbtaomhrzgelc.supabase.co' })).toThrow()
  })
  it.each(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'RESEND_API_KEY', 'LILLY_QBO_CLIENT_SECRET', 'LILLY_QBO_TOKEN_KEY', 'LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER', 'PATIENT_EMAIL_OUTBOX_KEY', 'DATABASE_URL', 'CRON_SECRET'])('rejects a retained non-fixture %s without exposing its value', key => {
    const value = 'private-test-canary'
    expect(() => assertDeploymentIsolation({ ...preview, [key]: value })).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    try { assertDeploymentIsolation({ ...preview, [key]: value }) } catch (error) {
      expect(String(error)).not.toContain(value)
    }
  })
  it('does not alter Production configuration or ordinary authentication', () => {
    expect(() => assertDeploymentIsolation({ ...preview, VERCEL_ENV: 'production', SUPABASE_SECRET_KEY: 'private-test-canary', NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://ruedelunbtaomhrzgelc.supabase.co' })).not.toThrow()
  })
  it('also denies privileged configuration in Vercel Development', () => {
    expect(() => assertDeploymentIsolation({ ...preview, VERCEL_ENV: 'development', SUPABASE_SECRET_KEY: 'private-test-canary' })).toThrow()
  })
})
