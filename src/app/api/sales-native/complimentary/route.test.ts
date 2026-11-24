import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({actor:vi.fn(),rpc:vi.fn(),contact:vi.fn()}))
vi.mock('@/server/sales-native/auth',()=>({resolveSalesActor:mocks.actor,nativeSalesErrorResponse:()=>Response.json({code:'DENIED'},{status:401})}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc:mocks.rpc,from:()=>({select:()=>({eq:()=>({eq:()=>({is:()=>({maybeSingle:mocks.contact})})})})})})}))
import {GET,POST} from './route'
const base={organizationId:'11111111-1111-4111-8111-111111111111',memberId:'22222222-2222-4222-8222-222222222222',role:'ADMINISTRATOR'}
const issue={action:'ISSUE',requestKey:'33333333-3333-4333-8333-333333333333',plan:'PLUS',months:6,reason:'Community',contactId:null,campaign:'Outreach',method:'REDEMPTION_CODE',validFrom:'2026-01-01T00:00:00Z',redeemBefore:'2027-01-01T00:00:00Z'}
const send=(body:unknown)=>POST(new Request('https://app.invalid/api/sales-native/complimentary',{method:'POST',body:JSON.stringify(body)}))
describe('complimentary CRM permissions and issuance',()=>{
 beforeEach(()=>{vi.stubEnv('LILLY_COMPLIMENTARY_ENABLED','true');mocks.actor.mockReset().mockResolvedValue(base);mocks.rpc.mockReset();mocks.contact.mockReset()})
 it.each(['SELLER','FINANCE','AUDITOR','SALES_MANAGER'])('denies %s before touching data',async role=>{
  mocks.actor.mockResolvedValue({...base,role});expect((await send(issue)).status).toBe(403);expect((await GET(new Request('https://app.invalid/api/sales-native/complimentary'))).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('ignores client-selected actor and tenant by rejecting extra fields',async()=>{
  expect((await send({...issue,organizationId:'injected'})).status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('returns a code only once and stores only a hash under resolved scope',async()=>{
  mocks.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{id:'benefit',replayed:false},error:null})
  const response=await send(issue),body=await response.json();expect(response.status).toBe(201);expect(body.code).toMatch(/^csco_[A-Za-z0-9_-]{43}$/)
  const args=mocks.rpc.mock.calls[1][1];expect(args.p_org).toBe(base.organizationId);expect(args.p_actor).toBe(base.memberId);expect(args.p_code_hash).toHaveLength(64);expect(JSON.stringify(args)).not.toContain(body.code)
  mocks.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{id:'benefit',replayed:true},error:null})
  expect((await (await send(issue)).json()).code).toBeNull()
 })
 it.each([null,'','   '])('rejects an incomplete assigned contact before issuing any benefit (%s)',async missing=>{
  mocks.rpc.mockResolvedValueOnce({data:true,error:null})
  mocks.contact.mockResolvedValue({data:{first_name:missing,last_name:'Synthetic'},error:null})
  const response=await send({...issue,contactId:'44444444-4444-4444-8444-444444444444',method:'ADMIN_DIRECT'})
  expect(response.status).toBe(422)
  expect(await response.json()).toEqual({code:'COMPLIMENTARY_CONTACT_INCOMPLETE'})
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
  expect(mocks.rpc.mock.calls[0][0]).toBe('native_sales_complimentary_admit')
 })
 it('rejects negative pagination without a database read',async()=>{
  expect((await GET(new Request('https://app.invalid/api/sales-native/complimentary?offset=-1'))).status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled()
 })
})
