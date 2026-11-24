import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
const f=vi.hoisted(()=>({create:vi.fn(),getUser:vi.fn(),module:vi.fn(),browserFrom:vi.fn(),queries:[] as {table:string;filters:unknown[][]}[],
 client:{NEXT_PUBLIC_APP_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://ruedelunbtaomhrzgelc.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'dummy-anon-key'},
 server:{SUPABASE_SECRET_KEY:'dummy-service-role-key'},readError:null as {message:string;code:string}|null,profile:{id:'f0000000-0000-4000-8000-000000000001',rol:'admin',activo:true}}))
vi.mock('@supabase/supabase-js',()=>({createClient:f.create}))
vi.mock('./env.client',()=>({clientEnv:f.client}))
vi.mock('./env.server',()=>({serverEnv:f.server}))
vi.mock('@/shared/db/requireAccess/ssrClient',()=>({default:()=>({auth:{getUser:f.getUser},rpc:f.module})}))
vi.mock('@/shared/db',()=>({supabase:{from:f.browserFrom}}))
vi.mock('@/shared/db/supabase',()=>({supabase:{from:f.browserFrom}}))
import {supabaseAdmin} from './supabaseAdmin'
import {GET as adminScopes} from '@/app/api/admin/user-scopes/[id]/route'
import {GET as directory} from '@/app/api/directory/route'
import {GET as taskDashboard} from '@/app/api/tasks/dashboard/route'
import requireModule from '@/shared/db/requireAccess/requireModule'
import billing from '@/shared/data/billing_v2/records'
import {listPacientes} from '@/features/medical/data/pacientes'
import {NextRequest} from 'next/server'
const userId='f0000000-0000-4000-8000-000000000001'
function from(table:string){
 const query={table,filters:[] as unknown[][]};f.queries.push(query)
 const chain={select:(_columns?:string)=>chain,eq:(...args:unknown[])=>{query.filters.push(args);return chain},
  not:(...args:unknown[])=>{query.filters.push(args);return chain},order:()=>chain,range:()=>chain,
  maybeSingle:async()=>({data:f.profile,error:null}),
  then:(resolve:(value:{data:unknown[]|null;error:typeof f.readError})=>unknown)=>Promise.resolve(resolve({data:f.readError?null:table==='usuario_empresas_acceso'?[{empresa_codigo:'SYNTHETIC'}]:[],error:f.readError}))}
 return chain
}
function environment(value:'production'|'local'|'preview'){
 vi.stubEnv('VERCEL_ENV',value==='local'?'':value)
 f.client.NEXT_PUBLIC_APP_ENV=value==='production'?'production':'local'
 f.client.NEXT_PUBLIC_SUPABASE_URL=value==='production'?'https://ruedelunbtaomhrzgelc.supabase.co':'http://127.0.0.1:54321'
}
beforeEach(()=>{
 vi.clearAllMocks();f.queries.length=0;f.readError=null
 for(const key of ['LILLY_ISOLATED_QA_APPROVAL_ID','LILLY_META_APP_SECRET','LILLY_SOCIAL_TOKEN_KEY','RESEND_API_KEY',
  'LILLY_QBO_CLIENT_ID','LILLY_QBO_CLIENT_SECRET','LILLY_QBO_TOKEN_KEY','LILLY_QBO_PRODUCTION_WEBHOOK_VERIFIER',
  'LILLY_QBO_RECONCILE_WORKER_SECRET','PATIENT_EMAIL_OUTBOX_KEY','CRON_SECRET','MEETINGS_MAIL_RECONCILE','DATABASE_URL',
  'POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','LILLY_SALES_SCHEMA_ADMIN_DB_URL',
  'SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY'])vi.stubEnv(key,'')
 environment('production');f.server.SUPABASE_SECRET_KEY='dummy-service-role-key'
 f.profile={id:userId,rol:'admin',activo:true}
 f.getUser.mockResolvedValue({data:{user:{id:userId}}});f.module.mockResolvedValue({data:true})
 f.create.mockImplementation(()=>({from}));f.browserFrom.mockImplementation(from)
})
afterEach(()=>vi.unstubAllEnvs())
const readScopes=()=>adminScopes(new NextRequest('https://lilly.invalid/api/admin/user-scopes/'+userId),{params:{id:userId}})
describe('real shared admin factory through existing module consumers',()=>{
 for(const tier of ['production','local','preview'] as const){
  it(`preserves authorized Admin scopes in ${tier} (preview uses synthetic keys only)`,async()=>{
   environment(tier)
   const response=await readScopes()
   expect(response.status).toBe(200);expect(await response.json()).toEqual({codes:['SYNTHETIC']})
   expect(f.queries.find(q=>q.table==='usuario_empresas_acceso')?.filters).toContainEqual(['usuario_id',userId])
   expect(f.create).toHaveBeenCalledWith(f.client.NEXT_PUBLIC_SUPABASE_URL,f.server.SUPABASE_SECRET_KEY,expect.objectContaining({auth:{autoRefreshToken:false,persistSession:false}}))
  })
  it(`preserves authorized Directory and module guard in ${tier}`,async()=>{
   environment(tier)
   const response=await directory()
   expect(response.status).toBe(200);expect(await response.json()).toEqual({members:[]})
   expect(f.module).toHaveBeenCalledWith('has_module',{p_slug:'directorio'})
   expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it(`keeps Billing reads on the session client in ${tier}`,async()=>{
   environment(tier);expect(await billing.list()).toEqual([])
   expect(f.browserFrom).toHaveBeenCalledWith('billing_v2_records');expect(f.create).not.toHaveBeenCalled()
  })
  it(`keeps Medical reads on the session client in ${tier}`,async()=>{
   environment(tier);expect(await listPacientes()).toEqual([])
   expect(f.browserFrom).toHaveBeenCalledWith('pacientes');expect(f.create).not.toHaveBeenCalled()
  })
  it(`preserves Tasks admin authorization and session-bound metrics in ${tier}`,async()=>{
   environment(tier)
   f.module.mockResolvedValue({data:{summary:[]},error:null})
   const response=await taskDashboard(new NextRequest('https://lilly.invalid/api/tasks/dashboard'))
   expect(response.status).toBe(200);expect(await response.json()).toEqual({summary:[]})
   expect(f.queries.map(q=>q.table)).toEqual(['usuarios'])
   expect(f.module).toHaveBeenCalledWith('lilly_task_metrics',expect.any(Object))
  })
  it(`preserves Stratix module authorization without a privileged client in ${tier}`,async()=>{
   environment(tier)
   expect(await requireModule('stratix-mkt')).toEqual({ok:true,userId})
   expect(f.module).toHaveBeenCalledWith('has_module',{p_slug:'stratix-mkt'})
   expect(f.create).not.toHaveBeenCalled()
  })
 }
 it('denies anonymous Admin before constructing a privileged client',async()=>{
  f.getUser.mockResolvedValue({data:{user:null}})
  expect((await readScopes()).status).toBe(401);expect(f.create).not.toHaveBeenCalled()
 })
 it.each([{rol:'sin_asignar',activo:true},{rol:'admin',activo:false}])('denies non-admin/inactive profiles without reading scopes: %j',async profile=>{
  f.profile={id:userId,...profile}
  expect((await readScopes()).status).toBe(403)
  expect(f.queries.map(q=>q.table)).toEqual(['usuarios'])
 })
 it.each([false,null])('denies Directory without its module before privileged reads: %s',async allowed=>{
  f.module.mockResolvedValue({data:allowed})
  expect((await directory()).status).toBe(403);expect(f.create).not.toHaveBeenCalled()
 })
 it('denies an anonymous Directory caller before checking modules or privileged reads',async()=>{
  f.getUser.mockResolvedValue({data:{user:null}})
  expect((await directory()).status).toBe(401);expect(f.module).not.toHaveBeenCalled();expect(f.create).not.toHaveBeenCalled()
 })
 it('denies non-admin Tasks metrics without calling the privileged metrics RPC',async()=>{
  f.profile={id:userId,rol:'sin_asignar',activo:true}
  expect((await taskDashboard(new NextRequest('https://lilly.invalid/api/tasks/dashboard'))).status).toBe(403)
  expect(f.module).not.toHaveBeenCalled()
 })
 it.each([false,null])('denies a patient-only/unassigned Stratix session when has_module returns %s',async allowed=>{
  f.module.mockResolvedValue({data:allowed})
  expect(await requireModule('stratix-mkt')).toMatchObject({ok:false,status:403})
  expect(f.create).not.toHaveBeenCalled()
 })
 for(const [name,read] of [['Admin',readScopes],['Directory',directory]] as const){
  it(`blocks ${name} Preview access to Production before constructing a client`,async()=>{
   environment('preview');f.client.NEXT_PUBLIC_SUPABASE_URL='https://ruedelunbtaomhrzgelc.supabase.co'
   await expect(read()).rejects.toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED')
   expect(f.create).not.toHaveBeenCalled();expect(f.queries).toEqual([])
  })
  it(`blocks ${name} with an unknown QA exception before constructing a client`,async()=>{
   environment('preview');vi.stubEnv('LILLY_ISOLATED_QA_APPROVAL_ID','unknown-review')
   await expect(read()).rejects.toThrow('NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED');expect(f.create).not.toHaveBeenCalled()
  })
 }
 it('does not elevate Billing reads after a session/RLS denial',async()=>{
  f.readError={message:'permission denied',code:'42501'}
  await expect(billing.list()).rejects.toThrow('Billing v2 records could not be read')
  expect(f.create).not.toHaveBeenCalled()
 })
 it('does not elevate Medical reads after a session/RLS denial',async()=>{
  f.readError={message:'permission denied',code:'42501'}
  await expect(listPacientes()).rejects.toEqual(f.readError)
  expect(f.create).not.toHaveBeenCalled()
 })
 it('does not block unrelated consumers in preview just because other features have real secrets configured (finding #1)',async()=>{
  environment('preview')
  for(const key of ['RESEND_API_KEY','LILLY_QBO_CLIENT_SECRET','LILLY_QBO_TOKEN_KEY','PATIENT_EMAIL_OUTBOX_KEY',
   'CRON_SECRET','DATABASE_URL','LILLY_META_APP_SECRET','LILLY_SOCIAL_TOKEN_KEY'])vi.stubEnv(key,'real-unrelated-secret')
  expect((await readScopes()).status).toBe(200)
  expect((await directory()).status).toBe(200)
 })
 it('preserves no-store fetch and stateless auth options',()=>{
  supabaseAdmin({noStore:true})
  const options=f.create.mock.calls[0][2] as {auth:{autoRefreshToken:boolean;persistSession:boolean};global:{fetch:typeof fetch}}
  expect(options.auth).toEqual({autoRefreshToken:false,persistSession:false})
  expect(options.global.fetch).toBeTypeOf('function')
 })
})
