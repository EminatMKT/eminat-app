import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ create: vi.fn(), client: {
  NEXT_PUBLIC_APP_ENV: 'local', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3197', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'dummy-anon-key',
}, server: { SUPABASE_SECRET_KEY: 'dummy-service-role-key' } }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mock.create }))
vi.mock('./env.client', () => ({ clientEnv: mock.client }))
vi.mock('./env.server', () => ({ serverEnv: mock.server }))
import { supabaseAdmin } from './supabaseAdmin'
beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'local')
  vi.stubEnv('LILLY_ISOLATED_QA_APPROVAL_ID', '')
  mock.client.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:3197'
  mock.server.SUPABASE_SECRET_KEY = 'dummy-service-role-key'
  mock.create.mockClear()
})
afterEach(() => vi.unstubAllEnvs())
describe('database client runtime isolation', () => {
  it('preserves synthetic fixtures', () => {
    supabaseAdmin()
    expect(mock.create).toHaveBeenCalledOnce()
  })
  it('rejects Production at runtime before constructing a client', () => {
    mock.client.NEXT_PUBLIC_SUPABASE_URL = 'https://ruedelunbtaomhrzgelc.supabase.co'
    expect(() => supabaseAdmin()).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('checks the actual parsed credential, not a different process binding', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'dummy-service-role-key')
    mock.server.SUPABASE_SECRET_KEY = 'private-runtime-canary'
    expect(() => supabaseAdmin()).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('rejects an unapproved isolated database even if build checks were skipped', () => {
    vi.stubEnv('LILLY_ISOLATED_QA_APPROVAL_ID', 'not-approved')
    expect(() => supabaseAdmin()).toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
    expect(mock.create).not.toHaveBeenCalled()
  })
})
