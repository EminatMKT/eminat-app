import {afterEach,describe,expect,it,vi} from 'vitest'
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
describe('dedicated hosted staging database boundary',()=>{
 it('accepts only its exact allocated database, without a production badge',async()=>{
  vi.stubEnv('NEXT_PUBLIC_APP_ENV','staging');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://sykxgksagbhmfrzbbtfe.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','synthetic-public-key');vi.resetModules()
  const env=await import('@/shared/db/env.client');expect(env.clientEnv.NEXT_PUBLIC_APP_ENV).toBe('staging');expect(env.isProdDb).toBe(false)
 })
 it.each(['https://ruedelunbtaomhrzgelc.supabase.co','https://unrelated.supabase.co','https://sykxgksagbhmfrzbbtfe.supabase.co.evil.invalid'])('rejects cross-environment target %s',async url=>{
  vi.stubEnv('NEXT_PUBLIC_APP_ENV','staging');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',url);vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','synthetic-public-key');vi.resetModules();await expect(import('@/shared/db/env.client')).rejects.toThrow()
 })
})
