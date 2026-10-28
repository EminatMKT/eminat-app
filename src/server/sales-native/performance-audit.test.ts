import { afterEach, expect, it, vi } from 'vitest'
import { measureSalesStage, salesPerformanceAudit } from './performance-audit'
afterEach(() => vi.unstubAllEnvs())
it('keeps Production headers unchanged even when audit is requested', async () => {
 vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('SALES_PERFORMANCE_AUDIT','1')
 const trace=salesPerformanceAudit()
 expect(trace.observe).toBeUndefined()
 expect(await measureSalesStage(trace.observe,'supabase_auth',()=>Promise.resolve('verified'))).toBe('verified')
 expect(trace.headers()).toEqual({'Cache-Control':'no-store'})
})
it('keeps measurements local to each Preview request and never changes operation errors',async()=>{
 vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('SALES_PERFORMANCE_AUDIT','1')
 const first=salesPerformanceAudit(),second=salesPerformanceAudit()
 await measureSalesStage(first.observe,'directory_rpc',()=>Promise.resolve(null))
 const denied=new Error('AUTHENTICATION_REQUIRED')
 await expect(measureSalesStage(second.observe,'supabase_auth',()=>Promise.reject(denied))).rejects.toBe(denied)
 expect(first.headers()['Server-Timing']).toContain('directory_rpc;dur=')
 expect(first.headers()['Server-Timing']).not.toContain('supabase_auth')
 expect(second.headers()['Server-Timing']).not.toContain('directory_rpc')
})
