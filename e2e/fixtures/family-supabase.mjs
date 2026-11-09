// Loopback-only synthetic identity source for UI screenshots. No real credentials.
import {createServer} from 'node:http'
if(process.env.NODE_ENV==='production')throw new Error('SYNTHETIC_API_FORBIDDEN_IN_PRODUCTION')
const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'family-ui@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
createServer((req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname
 let data=[]
 if(path==='/auth/v1/user')data=user
 else if(path.includes('/auth/v1/'))data={}
 else if(path.endsWith('/usuarios'))data=[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth_id:user.id,email:user.email,nombre:'LOCAL QA',apellido:'Family',rol:'admin',activo:true}]
 else if(path.endsWith('/sales_members'))data=[{organization_id:'9efab353-46a0-43d1-9901-e3f185dc5d30',role:'SUPERADMIN',sales_organizations:{id:'9efab353-46a0-43d1-9901-e3f185dc5d30',name:'Synthetic EMC',code:'emc',status:'active'}}]
 else if(path.endsWith('/roles'))data=[{key:'admin',label:'QA Admin'}]
 else if(path.endsWith('/role_modules'))data=[{role_key:'admin',module_slug:'sales'}]
 if(Array.isArray(data)&&req.headers.accept?.includes('vnd.pgrst.object'))data=data[0]??null
 res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Cache-Control':'no-store'})
 res.end(req.method==='OPTIONS'?'':JSON.stringify(data))
}).listen(3196,'127.0.0.1',()=>process.stdout.write('Loopback family UI identity fixture ready\n'))
