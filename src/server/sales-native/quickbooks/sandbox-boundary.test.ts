import {afterEach,describe,expect,it,vi} from 'vitest'
import {QboClient,QBO_CALLBACK} from './client'
import {qboEnvironment,qboCompanyMatches,qboConnectionRpc,QBO_SANDBOX_CALLBACK,QBO_SANDBOX_REALM} from './environment'
import {sealQboToken,openQboToken} from './token-vault'

const base={clientId:'synthetic-lilly-development-client',clientSecret:'synthetic-lilly-development-secret',
  redirectUri:QBO_SANDBOX_CALLBACK,environment:'sandbox' as const,allowedRealmId:QBO_SANDBOX_REALM} as const
function staging(){
 vi.stubEnv('NEXT_PUBLIC_APP_ENV','staging')
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://sykxgksagbhmfrzbbtfe.supabase.co')
 vi.stubEnv('LILLY_QBO_ENVIRONMENT','sandbox')
 vi.stubEnv('LILLY_QBO_SANDBOX_REALM_ID',QBO_SANDBOX_REALM)
 vi.stubEnv('VERCEL_ENV','')
 for(const name of ['LILLY_QBO_CLIENT_ID','LILLY_QBO_CLIENT_SECRET','LILLY_QBO_TOKEN_KEY','LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER'])vi.stubEnv(name,'')
}
afterEach(()=>vi.unstubAllEnvs())
describe('LILLY isolated Development connection',()=>{
 it('refuses a production client or callback in staging',()=>{
  staging()
  expect(()=>new QboClient({...base,environment:'production',redirectUri:QBO_CALLBACK})).toThrow('QBO_ENVIRONMENT_MISMATCH')
  expect(()=>new QboClient({...base,redirectUri:QBO_CALLBACK})).toThrow('QBO_ENVIRONMENT_MISMATCH')
 })
 it('requires the approved database, explicit sandbox mode and company',()=>{
  staging();expect(qboEnvironment()).toBe('sandbox')
  vi.stubEnv('LILLY_QBO_SANDBOX_REALM_ID','123456789')
  expect(()=>qboEnvironment()).toThrow('QBO_SANDBOX_ISOLATION_REQUIRED')
  vi.stubEnv('LILLY_QBO_SANDBOX_REALM_ID',QBO_SANDBOX_REALM)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://ruedelunbtaomhrzgelc.supabase.co')
  expect(()=>qboEnvironment()).toThrow('QBO_SANDBOX_ISOLATION_REQUIRED')
 })
 it('rejects production credentials before any provider request',()=>{
  staging();vi.stubEnv('LILLY_QBO_TOKEN_KEY','synthetic-production-key-canary')
  expect(()=>new QboClient(base)).toThrow('QBO_PRODUCTION_CREDENTIALS_FORBIDDEN_IN_STAGING')
 })
 it('only sends CompanyInfo to the approved sandbox host and company and disallows redirects',async()=>{
  staging()
  const request=vi.fn(async(url:string,init:RequestInit)=>{
   expect(url).toBe(`https://sandbox-quickbooks.api.intuit.com/v3/company/${QBO_SANDBOX_REALM}/companyinfo/${QBO_SANDBOX_REALM}`)
   expect(init.redirect).toBe('error')
   return Response.json({CompanyInfo:{Id:'1',CompanyName:'Synthetic LILLY Sandbox'}})
  })
  await new QboClient(base,request as unknown as typeof fetch).companyInfo(QBO_SANDBOX_REALM,'synthetic-access-token')
  expect(request).toHaveBeenCalledOnce()
 })
 it('rejects a different company before network access',async()=>{
  staging();const request=vi.fn();const client=new QboClient(base,request as unknown as typeof fetch)
  await expect(client.companyInfo('123456789','synthetic-access-token')).rejects.toThrow('QBO_REALM_NOT_AUTHORIZED')
  await expect(client.invoice('123456789','1','synthetic-access-token')).rejects.toThrow('QBO_REALM_NOT_AUTHORIZED')
  expect(request).not.toHaveBeenCalled()
 })
 it('cannot decrypt Development tokens in the Production context even with the same key',()=>{
  staging();const key=Buffer.alloc(32,7).toString('base64url');const org='9efab353-46a0-43d1-9901-e3f185dc5d30'
  const sealed=sealQboToken('synthetic-development-refresh-token',key,org,QBO_SANDBOX_REALM,'refresh')
  expect(openQboToken(sealed,key,org,QBO_SANDBOX_REALM,'refresh')).toBe('synthetic-development-refresh-token')
  vi.stubEnv('NEXT_PUBLIC_APP_ENV','local');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321');vi.stubEnv('LILLY_QBO_ENVIRONMENT','production')
  expect(()=>openQboToken(sealed,key,org,QBO_SANDBOX_REALM,'refresh')).toThrow('QBO_TOKEN_UNAVAILABLE')
 })
 it('accepts only the allocated sandbox company while preserving the Production legal-entity check',()=>{
  staging();expect(qboCompanyMatches({name:'Sandbox Company US 5c49'},QBO_SANDBOX_REALM)).toBe(true)
  expect(qboCompanyMatches({name:'Sandbox Company US 5c49'},'other-company')).toBe(false)
  vi.stubEnv('NEXT_PUBLIC_APP_ENV','local');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321');vi.stubEnv('LILLY_QBO_ENVIRONMENT','production')
  expect(qboCompanyMatches({name:'Sandbox Company US 5c49'},QBO_SANDBOX_REALM)).toBe(false)
  expect(qboCompanyMatches({name:'Eminat Medical Center LLC'},'production-company')).toBe(true)
 })
 it('uses separate sandbox connection RPCs and blocks arbitrary RPC mapping',()=>{
  staging();expect(qboConnectionRpc('native_sales_qbo_claim_refresh')).toBe('native_sales_qbo_sandbox_claim_refresh')
  expect(()=>qboConnectionRpc('native_sales_qbo_bypass')).toThrow('QBO_CONNECTION_RPC_INVALID')
 })
})
