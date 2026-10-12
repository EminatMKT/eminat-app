// Isolated PostgreSQL/WASM only. No provider credentials, external email or Supabase.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE)
const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE usuarios(id uuid PRIMARY KEY,auth_id uuid,nombre_display text,nombre text,apellido text,email text);
 CREATE TABLE meetings(id uuid PRIMARY KEY,user_id uuid,title text,meeting_date date,start_time time,end_time time,location text,created_at timestamptz DEFAULT now());
 CREATE TABLE meeting_participants(meeting_id uuid,profile_id uuid,PRIMARY KEY(meeting_id,profile_id));
 CREATE TABLE meeting_events(id uuid DEFAULT gen_random_uuid(),meeting_id uuid,actor_id uuid,event_type text);
 CREATE TABLE task_email_outbox(id uuid PRIMARY KEY,status text,provider_message_id text,sent_at timestamptz);
 INSERT INTO usuarios VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','QA Creator',NULL,NULL,'creator@example.test');
 INSERT INTO meetings(id,user_id,title,meeting_date,start_time,end_time,location) VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Untouched QA history','2026-10-12','10:00','11:00','QA');`)
const up=await readFile('supabase/pending/20261012173000_meetings_mail_storage.sql','utf8')
const down=await readFile('supabase/rollback/20261012173000_meetings_mail_storage.sql','utf8')
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
let checks=0
const check=x=>{assert.ok(x);checks++}
const business=()=>scalar("SELECT json_build_object('meetings',(SELECT json_agg(m) FROM meetings m),'users',(SELECT json_agg(u) FROM usuarios u))::text")
const before=await business()
const apply=()=>db.exec('BEGIN;\n'+up+'\nCOMMIT;')
await apply()
const watermark=await scalar('SELECT enabled_since::text FROM meeting_mail_activation')
await apply()
check(await business()===before)
check(await scalar('SELECT enabled_since::text FROM meeting_mail_activation')===watermark)
check(await scalar('SELECT count(*)::int FROM meeting_mail_events')===0)
check(await scalar("SELECT count(*)::int FROM pg_trigger WHERE tgname IN ('meeting_mail_after_created','meeting_mail_after_editorial','meeting_mail_after_invitees')")===3)
const mid='33333333-3333-4333-8333-333333333333'
const args=[mid,'qa-idempotent','minutes',JSON.stringify({from:'QA',subject:'QA',text:'QA'}),JSON.stringify([{name:'QA',email:'qa@example.test'},{name:'Duplicate',email:' QA@example.test '}])]
const event=await scalar('SELECT enqueue_meeting_mail($1,$2,$3,$4,$5)',args)
check(event===await scalar('SELECT enqueue_meeting_mail($1,$2,$3,$4,$5)',args))
check(await scalar('SELECT count(*)::int FROM meeting_mail_deliveries')===1)
const job=(await db.query('SELECT * FROM claim_meeting_mail($1,25,NULL)',[event])).rows[0]
check(await scalar('SELECT finish_meeting_mail($1,$2,$3,$4,NULL)',[job.id,job.claim_id,'accepted','provider-qa-id'])===true)
await apply()
check((await db.query('SELECT * FROM claim_meeting_mail($1,25,NULL)',[event])).rows.length===0)
check(await scalar('SELECT provider_message_id FROM meeting_mail_deliveries')==='provider-qa-id')
await db.exec('BEGIN;\n'+down+'\nCOMMIT;')
await db.exec('BEGIN;\n'+down+'\nCOMMIT;')
check(await scalar("SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE 'meeting_mail_after_%'")===0)
check(await business()===before)
check(await scalar('SELECT provider_message_id FROM meeting_mail_deliveries')==='provider-qa-id')
check(await scalar('SELECT count(*)::int FROM meeting_mail_attempts')===2)
await apply()
check(await scalar('SELECT enabled_since::text FROM meeting_mail_activation')===watermark)
check(await scalar('SELECT count(*)::int FROM meeting_mail_deliveries')===1)
await db.exec('SET ROLE authenticated')
await assert.rejects(()=>db.query('SELECT enqueue_meeting_mail($1,$2,$3,$4,$5)',args));checks++
await db.exec('RESET ROLE')
check(await business()===before)
await db.close()
console.log(JSON.stringify({result:'PASS',checks,engine:'isolated PostgreSQL/PGlite',hostedStagingValidated:false,productionAccess:false,emailsSent:0}))
