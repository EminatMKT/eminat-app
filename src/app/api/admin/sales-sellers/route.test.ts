import { beforeEach,describe,expect,it,vi } from 'vitest'

const state = vi.hoisted(() => ({
  admin:true,rpcCalls:[] as Record<string,unknown>[],
  rpcError:null as null | { code:string;message:string },
}))
vi.mock('@/shared/db/requireAdmin',() => ({ default:async () => state.admin
  ? { ok:true,userId:'a84190b5-c6b0-4681-928c-8c26feb857c3' }
  : { ok:false,status:403,error:'ADMIN_REQUIRED' } }))
vi.mock('@/shared/db/supabaseAdmin',() => ({ supabaseAdmin:() => ({
  rpc:async (_name:string,args:Record<string,unknown>) => {
    state.rpcCalls.push(args)
    return { data:{ id:'member',organization_id:args.p_organization_id,
      user_id:args.p_target_user_id,role:'SELLER',status:args.p_active ? 'active' : 'revoked' },
      error:state.rpcError }
  },
}) }))
import { POST } from './route'

const userId='540b3848-24a8-419d-b32a-2f7cc1dd44c9'
const organizationId='9efab353-46a0-43d1-9901-e3f185dc5d30'
const request = (body:unknown) => new Request('https://app.stratixsolutions.us/api/admin/sales-sellers',{
  method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify(body),
})

beforeEach(() => { state.admin=true;state.rpcError=null;state.rpcCalls=[] })
describe('admin-only scoped SELLER management',() => {
  it('never reaches service role for a non-admin',async () => {
    state.admin=false
    expect((await POST(request({ userId,organizationId,active:true }))).status).toBe(403)
    expect(state.rpcCalls).toEqual([])
  })
  it('rejects arbitrary roles and malformed organization IDs',async () => {
    expect((await POST(request({ userId,organizationId,active:true,role:'SUPERADMIN' }))).status)
      .toBe(422)
    expect((await POST(request({ userId,organizationId:'STRATIX',active:true }))).status)
      .toBe(422)
    expect(state.rpcCalls).toEqual([])
  })
  it('passes only the authenticated admin, exact organization, user and active state',async () => {
    const response = await POST(request({ userId,organizationId,active:true }))
    expect(response.status).toBe(200)
    expect(state.rpcCalls).toEqual([{ p_actor_user_id:'a84190b5-c6b0-4681-928c-8c26feb857c3',
      p_target_user_id:userId,p_organization_id:organizationId,p_active:true }])
    expect(await response.json()).toMatchObject({ member:{ role:'SELLER',status:'active' } })
  })
  it('does not report success when the atomic database guard refuses a patient',async () => {
    state.rpcError={ code:'42501',message:'PATIENT_IDENTITY_CANNOT_SELL' }
    const response = await POST(request({ userId,organizationId,active:true }))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ code:'PATIENT_IDENTITY_CANNOT_SELL' })
  })
})
