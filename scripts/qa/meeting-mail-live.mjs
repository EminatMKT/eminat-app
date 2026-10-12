// Manual, controlled QA only. No Supabase connection, Production CRUD or deployment.
// Reuses the existing RESEND_API_KEY; never creates a key or account.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createHash } from 'node:crypto'
const emails=(process.env.MEETINGS_QA_RECIPIENTS??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)
const existingKey=process.env.RESEND_API_KEY || process.env.MEETINGS_QA_RESEND_API_KEY
if (!existingKey || !process.env.PGLITE_MODULE || emails.length!==4 || new Set(emails).size!==4 ||
 emails.some(x=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) || process.env.MEETINGS_QA_ENABLE_LIVE!=='true') {
 console.error('BLOCKED: existing Resend key access, four verified QA mailboxes, isolated PGlite and explicit live-QA flag required')
 process.exit(2)
}
const require=createRequire(resolve('package.json'))
const ts=require('typescript'), {Resend}=require('resend')
const cache=new Map()
async function load(path) {
 const file=resolve(path); if(cache.has(file)) return cache.get(file)
 const content=await readFile(file,'utf8')
 const compiled=ts.transpileModule(content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const module={exports:{}}
 // Outbox/PDF/email modules import only native packages and the sender helper.
 const sender=file.endsWith('mail-outbox.ts') ? await load('src/features/meet/lib/email/sender.ts') : null
 new Function('exports','require','module',compiled)(module.exports,p=>p==='../lib/email/sender'?sender:require(p),module)
 cache.set(file,module.exports); return module.exports
}
const {PGlite}=await import(process.env.PGLITE_MODULE)
const db=new PGlite()
const id='11111111-1111-4111-8111-111111111111', auth='22222222-2222-4222-8222-222222222222'
const ids=['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666']
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE usuarios(id uuid PRIMARY KEY,auth_id uuid,nombre_display text,nombre text,apellido text,email text);
CREATE TABLE meetings(id uuid PRIMARY KEY,user_id uuid,title text,meeting_date date,start_time time,end_time time,location text,participants jsonb,status text,created_at timestamptz DEFAULT now());
CREATE TABLE meeting_participants(meeting_id uuid,profile_id uuid,PRIMARY KEY(meeting_id,profile_id));
CREATE TABLE meeting_events(id uuid DEFAULT gen_random_uuid(),meeting_id uuid,actor_id uuid,event_type text);`)
for(let i=0;i<4;i++) await db.query('INSERT INTO usuarios VALUES($1,$2,$3,NULL,NULL,$4)',[ids[i],i===0?auth:null,['QA Creator','QA Attendee','QA Absent','QA Task Responsible'][i],emails[i]])
await db.exec(await readFile('docs/sql/meetings-notification-outbox.review.sql','utf8'))
const stamp=new Date().toISOString(), marker='LILLY Meetings controlled QA '+stamp
await db.query("INSERT INTO meetings(id,user_id,title,meeting_date,start_time,end_time,location,participants,status) VALUES($1,$2,$3,current_date,'10:00','11:00','QA Room','[]','activa')",[id,auth,marker])
await db.query('INSERT INTO meeting_participants VALUES($1,$2),($1,$3)',[id,ids[1],ids[2]])
await db.query("INSERT INTO meeting_events(meeting_id,actor_id,event_type) VALUES($1,$2,'meeting_created')",[id,auth])
const signatures={
 enqueue_meeting_mail:['p_meeting_id','p_key','p_kind','p_payload','p_recipients'],
 claim_meeting_mail:['p_event_id','p_limit','p_meeting_id'],
 finish_meeting_mail:['p_id','p_claim_id','p_outcome','p_provider_id','p_error'],
 meeting_mail_status:['p_event_id'],
}
const adapter={rpc:async(name,args)=>{
 const keys=signatures[name]; if(!keys) throw new Error('Unapproved QA function')
 try {
  const parameters=keys.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k])
  const result=await db.query('SELECT * FROM '+name+'('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',parameters)
  return {data:['enqueue_meeting_mail','finish_meeting_mail'].includes(name)?Object.values(result.rows[0])[0]:result.rows,error:null}
 } catch(error){return {data:null,error:{message:error.message}}}
}}
process.env.MEETINGS_MAIL_MODE='qa'
process.env.RESEND_API_KEY=existingKey
const client=new Resend(existingKey)
let sendCalls=0
const provider={send:async(message,options)=>{await delay(600);sendCalls++;return client.emails.send(message,options)}}
const outbox=await load('src/features/meet/server/mail-outbox.ts')
const run=()=>outbox.processMeetingMail({db:adapter,provider,policy:outbox.meetingMailPolicy()})
await run()
await db.query("UPDATE meetings SET meeting_date=current_date+1,location='QA Updated Room' WHERE id=$1",[id])
await run()
const pdf=await load('src/features/meet/lib/pdf/meeting-report.ts')
const template=await load('src/features/meet/lib/email/meeting-report.ts')
const report={locale:'es',id,generatedAt:stamp,title:marker,company:'QA only',organization:null,location:'QA Updated Room',modality:'Virtual',meetingType:'QA',
 date:stamp.slice(0,10),startTime:'10:00',endTime:'11:00',duration:'1h',objective:'Controlled notification validation',
 invitees:[{name:'QA Attendee',role:null,organization:null},{name:'QA Absent',role:null,organization:null}],
 attendees:[{name:'QA Attendee',role:null,organization:null}],absentees:[{name:'QA Absent',role:null,organization:null}],externalGuests:[],
 tasks:[{id:'qa-task',title:'Controlled QA Task',description:null,responsible:'QA Task Responsible',team:null,department:null,dueDate:stamp.slice(0,10),status:'Pendiente'}],
 nextMeeting:null,sections:[]}
const {getStratixMeetSender}=await load('src/features/meet/lib/email/sender.ts')
await outbox.enqueueMeetingMail(adapter,{meetingId:id,key:'qa/minutes/'+stamp,kind:'minutes',recipients:emails.map((email,i)=>({name:['QA Creator','QA Attendee','QA Absent','QA Task Responsible'][i],email})),
 message:{from:getStratixMeetSender(),...template.buildMeetingReportEmail(report),attachments:[{filename:'qa-acta.pdf',content:Buffer.from(pdf.createMeetingPdf(report)).toString('base64')}]}})
await run()
const before=sendCalls
await run()
if(sendCalls!==before) throw new Error('Duplicate delivery attempted')
const {rows}=await db.query("SELECT email,status,provider_message_id FROM meeting_mail_deliveries")
if(rows.length!==10 || rows.some(r=>r.status!=='accepted'||!r.provider_message_id)) throw new Error('Acceptance incomplete; inspect controlled QA outbox')
const delivered=new Set()
for(let round=0;round<12 && delivered.size<rows.length;round++){
 for(const row of rows){
  if(delivered.has(row.provider_message_id)) continue
  await delay(600)
  const response=await client.emails.get(row.provider_message_id)
  if(response.error) throw new Error('Provider delivery lookup failed')
  if(response.data?.last_event==='delivered') delivered.add(row.provider_message_id)
  if(['bounced','complained','failed'].includes(response.data?.last_event)) throw new Error('Controlled QA message not delivered')
 }
 if(delivered.size<rows.length) await delay(8000)
}
await db.close()
console.log(JSON.stringify({result:delivered.size===rows.length?'PASS':'FAIL',accepted:rows.length,delivered:delivered.size,dedupe:sendCalls===before,productionDataAccess:false,
 evidence:rows.map(r=>({email_sha256:createHash('sha256').update(r.email).digest('hex'),provider_message_id:r.provider_message_id,delivered:delivered.has(r.provider_message_id)}))}))
if(delivered.size!==rows.length) process.exitCode=1

