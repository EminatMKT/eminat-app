import {beforeEach,describe,expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({actor:{memberId:'finance',verifier:true} as {memberId:string;verifier:boolean}|null,error:false,auditError:false,filters:[] as unknown[],calls:0}))
vi.mock('@/server/sales-native/patient-qbo-auth',()=>({patientQboActor:async()=>state.actor}))
vi.mock('@/server/sales-native/quickbooks/connection',()=>({EMC_ORGANIZATION_ID:'emc'}))
vi.mock('@/server/sales-native/quickbooks/environment',()=>({qboEnvironment:()=> 'sandbox'}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({from:(table:string)=>{
 state.calls++
 const q={select:()=>q,eq:(...args:unknown[])=>{state.filters.push(args);return q},order:()=>q,
 range:async(a:number,b:number)=>{state.filters.push(['range',a,b]);return {data:[{id:'event',entity_id:'168',review_reason:'UNLINKED_VOIDED_PAYMENT'}],error:state.error?{}:null}},
 in:async()=>({data:[{record_id:'event',changes:{reason:'UNLINKED_VOIDED_PAYMENT'},created_at:'2026-11-24'}],error:state.auditError?{}:null})}
 return q
}})}))
import {GET} from './route'
beforeEach(()=>{state.actor={memberId:'finance',verifier:true};state.error=false;state.auditError=false;state.filters=[];state.calls=0})
describe('read-only payment manual review',()=>{
 it('returns finance-only evidence for the canonical organization and current environment',async()=>{
  const response=await GET(new Request('https://stage.test/api/sales-native/quickbooks/reviews?offset=50'))
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store')
  expect(state.filters).toContainEqual(['organization_id','emc']);expect(state.filters).toContainEqual(['environment','sandbox'])
  expect(state.filters).toContainEqual(['status','MANUAL_REVIEW']);expect(state.filters).toContainEqual(['range',50,99])
  expect((await response.json()).data[0].audit).toHaveLength(1)
 })
 it.each([null,{memberId:'seller',verifier:false}])('denies an unauthenticated or non-verifying actor',async actor=>{
  state.actor=actor;expect((await GET(new Request('https://stage.test/reviews'))).status).toBe(403);expect(state.calls).toBe(0)
 })
 it.each(['offset=-1','offset=1.5','offset=100001','organization_id=other'])('rejects unsafe scope/pagination input %s',async query=>{
  expect((await GET(new Request('https://stage.test/reviews?'+query))).status).toBe(422);expect(state.calls).toBe(0)
 })
 it('fails closed when review evidence cannot be read',async()=>{state.auditError=true;expect((await GET(new Request('https://stage.test/reviews'))).status).toBe(503)})
})
