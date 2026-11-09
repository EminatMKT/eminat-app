import {beforeEach,describe,expect,it,vi} from 'vitest'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc})}))
vi.mock('./quickbooks/connection',()=>({EMC_ORGANIZATION_ID:'emc'}))
import {readPatientRenewals} from './patient-renewal'
beforeEach(()=>vi.clearAllMocks())
describe('Patient renewal read boundary',()=>{
  it('uses one scoped read for status, consent, invoice and paginated history',async()=>{
    const summary={membership:{id:'member'},hasPending:true,renewals:[],nextOffset:125}
    rpc.mockResolvedValue({data:summary,error:null})
    expect(await readPatientRenewals({id:'authenticated-identity',organization_id:'emc'},100)).toEqual(summary)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('native_sales_patient_renewal_summary',{
      p_identity_id:'authenticated-identity',p_limit:25,p_offset:100,
    })
  })
  it('rejects unrelated organizations before any privileged read',async()=>{
    await expect(readPatientRenewals({id:'identity',organization_id:'stratix'})).rejects.toThrow('PATIENT_RENEWAL_FORBIDDEN')
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([-1,100001,NaN,0.5])('rejects an invalid history cursor %s',async offset=>{
    await expect(readPatientRenewals({id:'identity',organization_id:'emc'},offset)).rejects.toThrow('INVALID_FILTER')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('does not expose database/provider details after a failed read',async()=>{
    rpc.mockResolvedValue({data:null,error:{message:'private database information'}})
    await expect(readPatientRenewals({id:'identity',organization_id:'emc'})).rejects.toThrow('RENEWAL_UNAVAILABLE')
  })
})
