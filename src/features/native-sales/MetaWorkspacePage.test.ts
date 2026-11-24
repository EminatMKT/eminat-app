import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({user:vi.fn(),profile:vi.fn(),organizations:vi.fn(),enabled:vi.fn()}))
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND')}}))
vi.mock('@/shared/db/requireAccess/ssrClient',()=>({default:()=>({auth:{getUser:mocks.user}})}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:mocks.profile})})})})})}))
vi.mock('@/server/sales-native/auth',()=>({readSalesOrganizations:mocks.organizations}))
vi.mock('@/server/sales-native/release-gate',()=>({nativeSalesEnabled:mocks.enabled}))
vi.mock('./MetaConnectionsWorkspace',()=>({default:()=>null}))
vi.mock('./MetaSettingsLanding',()=>({default:()=>null}))
import MetaWorkspacePage from './MetaWorkspacePage'
beforeEach(()=>{
 vi.clearAllMocks();mocks.enabled.mockReturnValue(true)
 mocks.user.mockResolvedValue({data:{user:{id:'identity'}}})
 mocks.profile.mockResolvedValue({data:{id:'profile'}})
 mocks.organizations.mockResolvedValue([{organizationId:'admin-org',name:'Admin',role:'ADMINISTRATOR'},
  {organizationId:'seller-org',name:'Seller',role:'SELLER'}])
})
it('reuses one guarded workspace for central and legacy routes',async()=>{
 const central=await MetaWorkspacePage({central:true,searchParams:{organization:'admin-org',company:'COMPANY'}})
 const legacy=await MetaWorkspacePage({searchParams:{organization:'admin-org',company:'COMPANY'}})
 expect(central.type).toBe(legacy.type)
 expect(central.props).toMatchObject({central:true,organizationId:'admin-org',company:'COMPANY',organizations:[{organizationId:'admin-org',name:'Admin'}]})
})
it.each(['seller-org','foreign-org',['admin-org','foreign-org']])('rejects unmanageable organization query %j',async organization=>{
 await expect(MetaWorkspacePage({central:true,searchParams:{organization}})).rejects.toThrow('NOT_FOUND')
})
it('rejects a marketing-only identity with no native administrator organization',async()=>{
 mocks.organizations.mockResolvedValue([{organizationId:'seller-org',name:'Seller',role:'SELLER'}])
 await expect(MetaWorkspacePage({central:true})).rejects.toThrow('NOT_FOUND')
})
it.each(['settings','integrations'] as const)('preserves authorized context on %s landing',async view=>{
 expect((await MetaWorkspacePage({view,searchParams:{organization:'admin-org',company:'COMPANY'}})).props)
  .toEqual({view,organization:'admin-org',company:'COMPANY'})
})
it('fails closed when release is disabled',async()=>{
 mocks.enabled.mockReturnValue(false)
 await expect(MetaWorkspacePage({central:true})).rejects.toThrow('NOT_FOUND')
 expect(mocks.user).not.toHaveBeenCalled()
})
it('fails closed without an authenticated active profile',async()=>{
 mocks.profile.mockResolvedValue({data:null})
 await expect(MetaWorkspacePage({central:true})).rejects.toThrow('NOT_FOUND')
})
