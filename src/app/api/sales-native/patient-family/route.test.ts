import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),actor:vi.fn()}))
vi.mock('@/server/sales-native/auth',()=>({resolveSalesActor:mocks.actor,nativeSalesErrorResponse:()=>Response.json({code:'DENIED'},{status:403})}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc:mocks.rpc})}))
vi.mock('@/server/sales-native/errors',()=>({nativeSalesDatabaseError:()=>Response.json({code:'DENIED'},{status:403})}))
import {GET,POST} from './route'
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',op='cccccccc-cccc-4ccc-8ccc-cccccccccccc',member='dddddddd-dddd-4ddd-8ddd-dddddddddddd',key='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
beforeEach(()=>{vi.clearAllMocks();mocks.actor.mockResolvedValue({organizationId:org,memberId:actor});mocks.rpc.mockResolvedValue({data:{canReview:true},error:null})})
describe('scoped family preparation',()=>{
 it('reads only the server-resolved organization and actor',async()=>{
  expect((await GET(new Request(`https://app.test/api/sales-native/patient-family?opportunityId=${op}`))).status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledWith('native_sales_family_preparation_status',{p_org:org,p_actor:actor,p_opportunity:op,p_membership:null})
 })
 it.each(['',`opportunityId=${op}&membershipId=${member}`,`opportunityId=${op}&organizationId=${org}`,'opportunityId=invalid'])('rejects ambiguous or injected context %s',async query=>{
  expect((await GET(new Request(`https://app.test/api/sales-native/patient-family?${query}`))).status).toBe(422)
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('posts an explicit approval with stale-edit and idempotency evidence, without activating coverage',async()=>{
  const response=await POST(new Request('https://app.test/api/sales-native/patient-family',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},
   body:JSON.stringify({intentId:op,memberId:member,decision:'APPROVED',expectedUpdatedAt:'2026-10-27T01:00:00.000Z'})}))
  expect(response.status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('native_sales_review_family_preparation',{p_org:org,p_actor:actor,p_intent:op,p_member:member,p_decision:'APPROVED',p_expected_updated_at:'2026-10-27T01:00:00.000Z',p_key:key})
 })
 it('propagates denied authorization without fallback writes',async()=>{
  mocks.rpc.mockResolvedValue({error:{code:'42501'}})
  expect((await GET(new Request(`https://app.test/api/sales-native/patient-family?membershipId=${member}`))).status).toBe(403)
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
 })
 it('rejects client-selected roles or organizations before a review write',async()=>{
  const response=await POST(new Request('https://app.test/api/sales-native/patient-family',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},
   body:JSON.stringify({intentId:op,memberId:member,decision:'APPROVED',expectedUpdatedAt:'2026-10-27T01:00:00.000Z',role:'SUPERADMIN',organizationId:org})}))
  expect(response.status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled()
 })
})
