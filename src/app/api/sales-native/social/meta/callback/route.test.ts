import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
const m=vi.hoisted(()=>({context:vi.fn(),exchange:vi.fn(),deployment:vi.fn()}))
vi.mock('@/server/sales-native/social/meta-connection',()=>({metaCallbackContext:m.context,exchangeMetaConnection:m.exchange,metaDeployment:m.deployment}))
vi.mock('@/server/sales-native/auth',()=>({
 NativeSalesAuthError:class extends Error {constructor(readonly status:number,readonly code:string){super(code)}},
}))
vi.mock('@/shared/db/requireAccess/ssrClient',()=>({default:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic-session'}}})}})}))
import {NativeSalesAuthError} from '@/server/sales-native/auth'
import {GET} from './route'
const path='/sales-native/integrations/meta?organization=f0000000-0000-4000-8000-000000000021&company=COMPANY_A'
beforeEach(()=>{m.deployment.mockReturnValue({origin:'https://app.stratixsolutions.us'})})
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
describe('Meta callback context',()=>{
 it('uses only the approved Preview origin for success and denial',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true')
  m.deployment.mockReturnValue({origin:'https://approved-qa.example.com'})
  m.context.mockResolvedValue(path);m.exchange.mockResolvedValue({returnPath:path})
  for(const query of ['code=private-code','error=access_denied']){
   const response=await GET(new Request(`https://approved-qa.example.com/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&${query}`))
   expect(new URL(response.headers.get('location')!).origin).toBe('https://approved-qa.example.com')
  }
 })
 it('does not redirect or access identity/provider when deployment validation fails',async()=>{
  m.deployment.mockImplementation(()=>{throw new Error('denied')})
  const response=await GET(new Request('https://forged.example/api/sales-native/social/meta/callback'))
  expect(response.status).toBe(503);expect(response.headers.get('location')).toBeNull()
  expect(m.context).not.toHaveBeenCalled();expect(m.exchange).not.toHaveBeenCalled()
 })
 it('rejects an external workspace redirect even if a service returns one',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true');m.context.mockResolvedValue('//evil.example/path')
  const response=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&error=access_denied`))
  expect(response.status).toBe(400);expect(response.headers.get('location')).toBeNull()
 })
 it('preserves the server-bound organization/company on success and does not expose codes/tokens',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true');m.context.mockResolvedValue(path);m.exchange.mockResolvedValue({returnPath:path})
  const response=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&code=private-code`))
  const location=response.headers.get('location')!
  expect(location).toContain('organization=f0000000-0000-4000-8000-000000000021')
  expect(location).toContain('company=COMPANY_A')
  expect(location).not.toMatch(/private-code|synthetic-session/)
  expect(response.headers.get('referrer-policy')).toBe('no-referrer')
 })
 it('returns consent denial to the same authorized workspace without exchanging a code',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true');m.context.mockResolvedValue(path)
  const response=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&error=access_denied`))
  expect(response.headers.get('location')).toContain('company=COMPANY_A')
  expect(response.headers.get('location')).toContain('META_AUTHORIZATION_DENIED')
  expect(m.exchange).not.toHaveBeenCalled()
 })
 it('redirects back to the central Settings path a connection was started from, not only the legacy page (PR #209 review finding #2 regression)',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true')
  const settingsPath='/settings/integrations/meta?organization=f0000000-0000-4000-8000-000000000021&company=COMPANY_A'
  m.context.mockResolvedValue(settingsPath);m.exchange.mockResolvedValue({returnPath:settingsPath})
  const response=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&code=private-code`))
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toContain('/settings/integrations/meta?')
 })
 it('passes through only the permission-unavailable reason, collapsing everything else (finding #5)',async()=>{
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED','true');m.context.mockResolvedValue(path)
  m.exchange.mockRejectedValue(new NativeSalesAuthError(409,'META_PERMISSION_UNAVAILABLE'))
  const permission=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&code=private-code`))
  expect(permission.headers.get('location')).toContain('metaError=META_PERMISSION_UNAVAILABLE')
  m.exchange.mockRejectedValue(new Error('provider timeout'))
  const generic=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&code=private-code`))
  expect(generic.headers.get('location')).toContain('metaError=META_CONNECTION_UNAVAILABLE')
  m.exchange.mockRejectedValue(new NativeSalesAuthError(409,'META_GRANT_UNAVAILABLE'))
  const other=await GET(new Request(`https://app.stratixsolutions.us/api/sales-native/social/meta/callback?state=${'a'.repeat(43)}&code=private-code`))
  expect(other.headers.get('location')).toContain('metaError=META_CONNECTION_UNAVAILABLE')
 })
})
