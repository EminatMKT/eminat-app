import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),identity:vi.fn()}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc:mocks.rpc,from:mocks.from})}))
vi.mock('../auth',()=>({
 NativeSalesAuthError:class extends Error {constructor(readonly status:number,readonly code:string){super(code)}},
 resolveSalesActor:mocks.identity,
}))
import { MetaGraphClient } from './meta-graph'
import { beginMetaConnection,checkMetaConnectionHealth,completeMetaConnection,exchangeMetaConnection,listMetaGrantPages,metaCallbackContext,revokeMetaConnection } from './meta-connection'
import { sealSocialToken } from './token-vault'
import type { SalesActor } from '../policy'
const org='f0000000-0000-4000-8000-000000000021',member='f0000000-0000-4000-8000-000000000011'
const stateId='f0000000-0000-4000-8000-000000000099',assetId='f0000000-0000-4000-8000-000000000100'
const actor:SalesActor={organizationId:org,memberId:member,userId:'f0000000-0000-4000-8000-000000000001',role:'ADMINISTRATOR',teamIds:[]}
const state='a'.repeat(43),key=Buffer.alloc(32,7).toString('base64url')
let row:Record<string,unknown>
let selected:Record<string,string>[]
function query(data:unknown){
 const q={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),order:vi.fn(),limit:vi.fn(),in:vi.fn(),update:vi.fn(),then:undefined as unknown}
 for(const method of ['select','eq','order','limit','in','update'] as const)q[method].mockReturnValue(q)
 q.maybeSingle.mockResolvedValue({data,error:null})
 q.then=(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)
 return q
}
beforeEach(()=>{
 vi.stubEnv('LILLY_META_OAUTH_ENABLED','true');vi.stubEnv('LILLY_META_APP_ID','synthetic-app')
 vi.stubEnv('LILLY_META_APP_SECRET','synthetic-secret-only-123456');vi.stubEnv('LILLY_META_GRAPH_VERSION','v24.0')
 vi.stubEnv('LILLY_SOCIAL_TOKEN_KEY',key)
 row={id:stateId,organization_id:org,requester_member_id:member,company_code:'COMPANY_A',app_id:'synthetic-app',
  status:'EXCHANGED',expires_at:new Date(Date.now()+60000).toISOString(),grant_expires_at:new Date(Date.now()+3600000).toISOString(),
  grant_ciphertext:sealSocialToken('synthetic-user-token',key,org,stateId),reconnect_integration_id:null}
 selected=[{id:assetId,token_ciphertext:sealSocialToken('synthetic-page-token',key,org,assetId)}]
 mocks.rpc.mockReset().mockResolvedValue({data:{integrationId:'metadata-only'},error:null})
 mocks.from.mockReset().mockImplementation(table=>query(table==='sales_social_oauth_states'?row:selected))
 mocks.identity.mockReset().mockResolvedValue(actor)
})
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()})
describe('Meta tenant/company service boundary',()=>{
 it('authorizes an explicit company before creating an OAuth state and requests discovery only',async()=>{
  const result=await beginMetaConnection(actor,{companyCode:'COMPANY_A'})
  expect(mocks.rpc.mock.calls[0][0]).toBe('native_meta_require_company')
  expect(new URL(result.url).searchParams.get('scope')).toBe('pages_show_list')
  expect(result).not.toHaveProperty('token')
  expect(mocks.rpc).toHaveBeenCalledWith('native_meta_begin',expect.objectContaining({p_org:org,p_member:member,p_company:'COMPANY_A'}))
 })
 it('rejects company denial before any Graph operation or state creation',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'denied'}})
  await expect(beginMetaConnection(actor,{companyCode:'FOREIGN'})).rejects.toThrow('META_COMPANY_ACCESS_DENIED')
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
 })
 it.each(['organization_id','requester_member_id','status','expires_at'])('rejects foreign, expired and replayed handoff: %s',async(field)=>{
  row[field]=field==='expires_at'?'2000-01-01T00:00:00Z':field==='status'?'CONSUMED':'f0000000-0000-4000-8000-000000000999'
  await expect(listMetaGrantPages(actor,state)).rejects.toThrow('META_GRANT_UNAVAILABLE')
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('rejects a mismatched callback identity rather than adopting the state requester',async()=>{
  row.status='PENDING';mocks.identity.mockResolvedValue({...actor,memberId:'foreign'})
  await expect(metaCallbackContext(state,'synthetic-session')).rejects.toThrow('META_GRANT_UNAVAILABLE')
 })
 it('finishes a large discovery using separately encrypted candidates without aggregate token storage',async()=>{
  mocks.rpc.mockImplementation(async(name)=>({data:name==='native_meta_exchange_claim'?{id:stateId,company:'COMPANY_A',appId:'synthetic-app'}:{},error:null}))
  vi.spyOn(MetaGraphClient.prototype,'exchange').mockResolvedValue({token:'synthetic-user-token',expiresAt:new Date(Date.now()+3600000)})
  vi.spyOn(MetaGraphClient.prototype,'grantedPermissions').mockResolvedValue(['pages_show_list'])
  vi.spyOn(MetaGraphClient.prototype,'authorizingUserId').mockResolvedValue('meta-principal-1')
  vi.spyOn(MetaGraphClient.prototype,'discoverPages').mockResolvedValue(Array.from({length:30},(_,i)=>({id:`page-${i}`,name:`Page ${i}`,access_token:'synthetic-page-token'.repeat(100)})))
  const result=await exchangeMetaConnection(state,'synthetic-code','synthetic-session')
  expect(result.returnPath).toContain(`organization=${org}`)
  expect(result.returnPath).toContain('company=COMPANY_A')
  const finish=mocks.rpc.mock.calls.find(call=>call[0]==='native_meta_exchange_finish')![1]
  expect(finish.p_assets).toHaveLength(30)
  expect(JSON.stringify(finish.p_assets)).not.toContain('synthetic-page-token')
  expect(finish).not.toHaveProperty('p_pages_ciphertext')
  expect(result).toEqual({state,returnPath:`/sales-native/integrations/meta?organization=${org}&company=COMPANY_A`})
 })
 it('rewraps selected credentials with integration context and returns only the RPC metadata',async()=>{
  const result=await completeMetaConnection(actor,{state,assetIds:[assetId],relationship:'AGENCY_DELEGATED'})
  expect(result).toEqual({integrationId:'metadata-only'})
  expect(JSON.stringify(result)).not.toMatch(/synthetic.*token|ciphertext/)
  const args=mocks.rpc.mock.calls.find(call=>call[0]==='native_meta_complete')![1]
  expect(args.p_selected[0].ciphertext).not.toContain('synthetic-page-token')
  expect(args.p_org).toBe(org)
 })
 it('keeps disconnect local, even without provider configuration',async()=>{
  vi.stubEnv('LILLY_META_OAUTH_ENABLED','false')
  const provider=vi.spyOn(MetaGraphClient.prototype,'subscribePage')
  await revokeMetaConnection(actor,{integrationId:stateId})
  expect(mocks.rpc).toHaveBeenCalledWith('native_meta_disconnect',{p_org:org,p_member:member,p_integration:stateId})
  expect(provider).not.toHaveBeenCalled()
 })
 it('sanitizes arbitrary database failures, including credential-bearing error text',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{code:'XX000',message:'private synthetic-user-token'}})
  await expect(revokeMetaConnection(actor,{integrationId:stateId})).rejects.toThrow('META_CONNECTION_UNAVAILABLE')
 })
})

describe('company-authorized connection health',()=>{
 function healthRows(appId='synthetic-app'){
  mocks.from.mockImplementation(table=>query(table==='sales_social_integrations'
   ?{id:stateId,company_code:'COMPANY_A',grant_id:assetId,status:'CONNECTED'}
   :table==='sales_social_grants'?{id:assetId,app_id:appId,status:'ACTIVE',expires_at:new Date(Date.now()+3600000).toISOString(),token_ciphertext:sealSocialToken('synthetic-user-token',key,org,assetId)}
   :table==='sales_social_accounts'?[{id:stateId}]:[{external_asset_id:'permitted-page'}]))
 }
 it('requires reconnect if a previously selected asset disappears, without returning credentials',async()=>{
  healthRows()
  vi.spyOn(MetaGraphClient.prototype,'connectionHealth').mockResolvedValue({status:'ACTIVE',permissions:['pages_show_list']})
  vi.spyOn(MetaGraphClient.prototype,'discoverPages').mockResolvedValue([])
  const result=await checkMetaConnectionHealth(actor,{integrationId:stateId})
  expect(result.status).toBe('ASSET_ACCESS_REMOVED')
  expect(JSON.stringify(result)).not.toMatch(/synthetic-user-token|ciphertext/)
  expect(mocks.rpc).toHaveBeenCalledWith('native_meta_record_health',expect.objectContaining({p_grant:assetId,p_result:'ASSET_ACCESS_REMOVED'}))
 })
 it('does not call Graph with a grant issued by a different configured app',async()=>{
  healthRows('foreign-app')
  const provider=vi.spyOn(MetaGraphClient.prototype,'connectionHealth')
  await expect(checkMetaConnectionHealth(actor,{integrationId:stateId})).rejects.toThrow('META_RECONNECT_REQUIRED')
  expect(provider).not.toHaveBeenCalled()
 })
})
