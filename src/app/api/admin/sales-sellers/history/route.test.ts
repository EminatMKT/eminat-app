import { beforeEach,describe,expect,it,vi } from 'vitest'

const state = vi.hoisted(() => ({
  admin:true,queries:[] as Array<{ table:string;filters:Array<[string,string]> }>,
}))
const memberId='f104886e-1b03-4b90-939c-6595df0faf93'
const userId='22be6f8b-0634-4f3d-b36c-ffbee54ed372'
const organizationId='9efab353-46a0-43d1-9901-e3f185dc5d30'
vi.mock('@/shared/db/requireAdmin',() => ({ default:async () => state.admin
  ? { ok:true,userId:'2344e112-76ef-42a8-ac56-7c488084e0f5' }
  : { ok:false,status:403,error:'ADMIN_REQUIRED' } }))
vi.mock('@/shared/db/supabaseAdmin',() => ({ supabaseAdmin:() => ({
  from:(table:string) => {
    const query = { table,filters:[] as Array<[string,string]> }
    state.queries.push(query)
    const result = () => ({ data:table==='sales_members' ? { id:memberId }
      : table==='usuarios' ? { id:userId }
      : table==='sales_history' ? [{ id:'event-1',action:'seller_access_revoked',
        occurred_at:'2026-10-23T11:40:00Z',request_id:'request-1',
        changes:{ actorUserId:'2344e112-76ef-42a8-ac56-7c488084e0f5',
          previousStatus:'active',newStatus:'revoked' } }]
      : [{ id:'event-2',accion:'validated',created_at:'2026-10-22T10:00:00Z',
        usuario_id:'2344e112-76ef-42a8-ac56-7c488084e0f5',
        valor_anterior:'pending',valor_nuevo:'active' }],error:null })
    const chain = {
      select:() => chain,
      eq:(key:string,value:string) => { query.filters.push([key,value]);return chain },
      in:() => chain,order:() => chain,limit:async () => result(),
      maybeSingle:async () => result(),
    }
    return chain
  },
}) }))
import { GET } from './route'
const request = () => new Request(`https://app.stratixsolutions.us/api/admin/sales-sellers/history?organizationId=${organizationId}&userId=${userId}`)

beforeEach(() => { state.admin=true;state.queries=[] })
describe('Seller access history',() => {
  it('rejects a non-admin before reading any audit rows',async () => {
    state.admin=false
    expect((await GET(request())).status).toBe(403)
    expect(state.queries).toEqual([])
  })
  it('reads only the requested organization, target and canonical member',async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(state.queries.find(q => q.table==='sales_history')?.filters).toEqual([
      ['organization_id',organizationId],['entity_type','sales_member'],['record_id',memberId],
    ])
    expect(state.queries.find(q => q.table==='historial')?.filters).toEqual([
      ['tabla','usuarios'],['registro_id',userId],
    ])
    expect(await response.json()).toMatchObject({ events:[
      { action:'seller_access_revoked',previousState:'active',newState:'revoked' },
      { action:'validated',previousState:'pending',newState:'active' },
    ] })
  })
})
