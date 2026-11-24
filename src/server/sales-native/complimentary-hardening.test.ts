import {describe,expect,it,vi} from 'vitest'
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({})}))
import {complimentaryInput} from './complimentary'
import {benefitActions} from '@/features/native-sales/complimentary-presentation'
const id='11111111-1111-4111-8111-111111111111'
describe('complimentary policy and lifecycle boundaries',()=>{
 it('accepts only an explicit administrator reactivation with no extension months',()=>{
  expect(complimentaryInput.safeParse({action:'REACTIVATE',id,months:null,reason:'Reviewed suspended coverage'}).success).toBe(true)
  expect(complimentaryInput.safeParse({action:'REACTIVATE',id,months:3,reason:'Reset expiry'}).success).toBe(false)
  expect(benefitActions('SUSPENDED','2030-01-01T00:00:00Z',Date.parse('2026-11-23'))).toContain('REACTIVATE')
  expect(benefitActions('REVOKED','2030-01-01T00:00:00Z')).not.toContain('REACTIVATE')
  expect(benefitActions('SUSPENDED','2020-01-01T00:00:00Z')).not.toContain('REACTIVATE')
 })
 it('requires custom proposal expiry, justification and server-resolved identity without activating it',()=>{
  const request={action:'CUSTOM_REQUEST',requestKey:id,plan:'MAX',months:5,expirationDate:'2027-05-01',reason:'Written policy review',contactId:null}
  expect(complimentaryInput.safeParse(request).success).toBe(true)
  for(const override of [{expirationDate:undefined},{reason:''},{administratorId:id},{months:3}])expect(complimentaryInput.safeParse({...request,...override}).success).toBe(false)
  expect(complimentaryInput.safeParse({...request,action:'ISSUE',method:'ADMIN_DIRECT'}).success).toBe(false)
 })
})
