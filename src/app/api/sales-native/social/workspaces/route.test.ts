import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({organizations:vi.fn()}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:vi.fn()}))
vi.mock('@/server/sales-native/auth',async importOriginal=>({
 ...await importOriginal<typeof import('@/server/sales-native/auth')>(),resolveSalesOrganizations:mocks.organizations,
}))
import {NativeSalesAuthError} from '@/server/sales-native/auth'
import {GET} from './route'
beforeEach(()=>vi.clearAllMocks())
it('projects eligible identity-scoped organizations only, without roles, credentials or company records',async()=>{
 mocks.organizations.mockResolvedValue([{organizationId:'a',name:'A',role:'ADMINISTRATOR',code:'secret-code'},
  {organizationId:'b',name:'B',role:'SELLER'},{organizationId:'c',name:'C',role:'SUPERADMIN'}])
 const response=await GET(new Request('https://lilly.invalid/api/sales-native/social/workspaces'))
 expect(await response.json()).toEqual({data:[{organizationId:'a',name:'A'},{organizationId:'c',name:'C'}]})
 expect(response.headers.get('Cache-Control')).toBe('no-store')
})
it('does not grant visibility based on corporate marketing access or a seller membership',async()=>{
 mocks.organizations.mockResolvedValue([{organizationId:'a',name:'A',role:'SELLER'}])
 expect(await (await GET(new Request('https://lilly.invalid'))).json()).toEqual({data:[]})
})
it.each([401,403,503])('fails closed on identity or discovery failure %i',async status=>{
 mocks.organizations.mockRejectedValue(new NativeSalesAuthError(status,'SALES_ACCESS_DENIED'))
 const response=await GET(new Request('https://lilly.invalid'))
 expect(response.status).toBe(status)
 expect(await response.json()).toMatchObject({code:'SALES_ACCESS_DENIED'})
})
