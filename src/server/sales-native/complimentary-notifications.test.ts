import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),queue:vi.fn()}))
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:()=>({rpc:mocks.rpc})}))
vi.mock('./patient-email-outbox',()=>({queuePatientEmail:mocks.queue}))
import {processComplimentaryNotifications} from './complimentary-notifications'
describe('complimentary reminder copy',()=>{
 beforeEach(()=>{vi.stubEnv('PATIENT_SALES_ORGANIZATION_ID','11111111-1111-4111-8111-111111111111');vi.stubEnv('COMPLIMENTARY_PORTAL_ORIGIN','https://portal.corazonsalud.health');mocks.rpc.mockReset();mocks.queue.mockReset()})
 it('shows the inclusive final coverage date in the captured timezone without claiming automatic payment',async()=>{
  mocks.rpc.mockResolvedValue({data:[{id:'benefit',plan:'PLUS',expires_at:'2027-03-15T04:00:00Z',timezone:'America/New_York',email:'synthetic@example.invalid',days:7}],error:null});mocks.queue.mockResolvedValue({status:'QUEUED'})
  expect(await processComplimentaryNotifications()).toEqual({processed:1,queued:1,failed:0})
  expect(mocks.queue.mock.calls[0][0].content.details).toContainEqual({label:'Último día de cobertura',value:'14 de marzo de 2027'})
  expect(mocks.queue.mock.calls[0][0].content.details).toContainEqual({label:'Zona horaria de cobertura',value:'America/New_York'})
  expect(mocks.queue.mock.calls[0][0].content.message).toContain('No se hará ningún cobro de membresía ni renovación de pago automática')
 })
})
