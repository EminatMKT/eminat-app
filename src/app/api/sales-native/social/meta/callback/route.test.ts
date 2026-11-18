import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
const m=vi.hoisted(()=>({context:vi.fn(),exchange:vi.fn(),deployment:vi.fn()}))
vi.mock('@/server/sales-native/social/meta-connection',()=>({metaCallbackContext:m.context,exchangeMetaConnection:m.exchange,metaDeployment:m.deployment}))
vi.mock('@/shared/db/requireAccess/ssrClient',()=>({default:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic-session'}}})}})}))
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
})
