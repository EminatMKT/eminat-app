import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc:mocks.rpc})}))
import {complimentaryCode,complimentaryDigest,codeInput,redeemComplimentary,complimentaryInput} from './complimentary'
describe('complimentary patient boundary',()=>{
 beforeEach(()=>{vi.stubEnv('LILLY_COMPLIMENTARY_ENABLED','true');mocks.rpc.mockReset()})
 it('generates distinct 256-bit codes and stable digests without retaining plaintext',()=>{
  const codes=new Set(Array.from({length:200},complimentaryCode));expect(codes.size).toBe(200)
  for(const code of Array.from(codes)){expect(codeInput.safeParse({code,preview:true}).success).toBe(true);expect(complimentaryDigest(code)).toMatch(/^[a-f0-9]{64}$/)}
 })
 it('fails closed while disabled without touching storage',async()=>{
  vi.stubEnv('LILLY_COMPLIMENTARY_ENABLED','false');expect((await redeemComplimentary('auth','org',{})).status).toBe(404);expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('counts malformed guesses against the authenticated identity',async()=>{
  mocks.rpc.mockResolvedValue({data:true,error:null});expect((await redeemComplimentary('auth','org',{code:'bad',preview:true})).status).toBe(422)
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('native_sales_complimentary_admit',{p_subject:complimentaryDigest('patient:auth')})
 })
 it('rejects quota failures before parsing and redeeming',async()=>{
  mocks.rpc.mockResolvedValue({data:false,error:null});expect((await redeemComplimentary('auth','org',{code:complimentaryCode(),preview:false})).status).toBe(429);expect(mocks.rpc).toHaveBeenCalledTimes(1)
 })
 it('refuses injected plan, duration, beneficiary or organization',async()=>{
  for(const field of ['plan','months','authId','organizationId']){
   mocks.rpc.mockResolvedValue({data:true,error:null});const response=await redeemComplimentary('auth','org',{code:complimentaryCode(),preview:false,[field]:'injected'});expect(response.status).toBe(422)
  }
 })
 it('passes only code digest and authenticated scope into atomic redemption',async()=>{
  const code=complimentaryCode();mocks.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{status:'ACTIVE'},error:null})
  expect((await redeemComplimentary('verified-auth','server-org',{code,preview:false})).status).toBe(200)
  expect(mocks.rpc).toHaveBeenLastCalledWith('native_sales_complimentary_redeem',{p_org:'server-org',p_auth:'verified-auth',p_code_hash:complimentaryDigest(code),p_preview:false})
  expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(code)
 })
 it('does not expose database errors or code existence details',async()=>{
  mocks.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:null,error:{message:'COMPLIMENTARY_CODE_UNAVAILABLE secret'}})
  const response=await redeemComplimentary('auth','org',{code:complimentaryCode(),preview:false});expect(response.status).toBe(409);expect(await response.json()).toEqual({code:'COMPLIMENTARY_UNAVAILABLE'})
 })
 it('requires a beneficiary for direct activation',()=>{
  expect(complimentaryInput.safeParse({action:'ISSUE',requestKey:crypto.randomUUID(),plan:'MAX',months:3,reason:'Support',contactId:null,campaign:null,method:'ADMIN_DIRECT',validFrom:'2026-01-01T00:00:00Z',redeemBefore:'2027-01-01T00:00:00Z'}).success).toBe(false)
 })
})

// The canonical database dates also end coverage; this projection preserves the
// exact benefit status and timestamp when housekeeping has not run yet.
