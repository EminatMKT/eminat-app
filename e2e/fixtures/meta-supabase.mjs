// Loopback synthetic identity/organization metadata only. Never a live Supabase endpoint.
import {createServer} from 'node:http'
if(process.env.NODE_ENV==='production')throw new Error('SYNTHETIC_API_FORBIDDEN_IN_PRODUCTION')
const user={id:'f0000000-0000-4000-8000-000000000001',email:'meta-ui@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
createServer((req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname
 let data=[]
 if(path==='/auth/v1/user')data=user
 else if(path.includes('/auth/v1/'))data={}
 else if(path.endsWith('/usuarios'))data=[{id:user.id,auth_id:user.id,email:user.email,nombre:'Synthetic',apellido:'Meta',rol:'admin',activo:true}]
 else if(path.endsWith('/sales_members'))data=[21,22].map(n=>({organization_id:`f0000000-0000-4000-8000-${String(n).padStart(12,'0')}`,role:'ADMINISTRATOR',sales_organizations:{id:`f0000000-0000-4000-8000-${String(n).padStart(12,'0')}`,name:`Synthetic organization ${n}`,code:`qa-${n}`,status:'active'}}))
 else if(path.endsWith('/roles'))data=[{key:'admin',label:'QA Admin'}]
 else if(path.endsWith('/role_modules'))data=[{role_key:'admin',module_slug:'sales'}]
 if(Array.isArray(data)&&req.headers.accept?.includes('vnd.pgrst.object'))data=data[0]??null
 res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Cache-Control':'no-store'})
 res.end(req.method==='OPTIONS'?'':JSON.stringify(data))
}).listen(3197,'127.0.0.1',()=>process.stdout.write('Loopback Meta UI identity fixture ready\n'))
