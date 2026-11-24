import {afterEach,describe,expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({benefit:null as Record<string,unknown>|null,error:null as {message:string}|null,scopes:[] as unknown[][]}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({from:(table:string)=>{
 state.scopes.push([table]);return{select(){return this},eq(...args:unknown[]){state.scopes.push(args);return this},async maybeSingle(){return{data:state.benefit,error:state.error}}}
}})}))
import {complimentaryCoverage} from './complimentary'
const row={id:'membership',funding_type:'COMPLIMENTARY',complimentary_benefit_id:'benefit',status:'ACTIVE',expires_at:'2027-01-31'}
afterEach(()=>{vi.useRealTimers();state.scopes=[];state.error=null})
describe('complimentary access lifecycle',()=>{
 it('preserves paid coverage without querying benefit state',async()=>{
  const paid={...row,funding_type:'PAID'};expect(await complimentaryCoverage(paid,'org')).toEqual(paid);expect(state.scopes).toEqual([])
 })
 it('expires at the exact exclusive timestamp even before a worker runs',async()=>{
  vi.useFakeTimers();vi.setSystemTime('2027-02-01T05:00:00Z');
  state.benefit={status:'ACTIVE',activated_at:'2026-11-01T14:00:00Z',expires_at:'2027-02-01T05:00:00Z',duration_months:3,payment_requirement:'WAIVED'}
  expect((await complimentaryCoverage(row,'org')).status).toBe('EXPIRED');expect(state.scopes).toContainEqual(['organization_id','org']);expect(state.scopes).toContainEqual(['membership_id','membership'])
 })
 it.each(['SUSPENDED','REVOKED'])('enforces %s immediately',async status=>{
  state.benefit={status,expires_at:'2099-01-01T00:00:00Z',duration_months:3};expect((await complimentaryCoverage(row,'org')).status).toBe(status)
 })
 it('fails closed if the authorization is missing',async()=>{
  state.benefit=null;await expect(complimentaryCoverage(row,'org')).rejects.toThrow('COMPLIMENTARY_COVERAGE_UNAVAILABLE')
 })
})
