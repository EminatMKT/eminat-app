// Isolated PostgreSQL/WASM only. No provider credentials, external email or Supabase.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE)
const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 -- Relevant column types/nullability and unique indexes observed read-only in Production.
 -- This is a synthetic dependency fixture, not a copy of Production users or data.
 CREATE TABLE usuarios(id uuid PRIMARY KEY,auth_id uuid UNIQUE,nombre_display text,nombre text NOT NULL,apellido text NOT NULL,email text NOT NULL UNIQUE);
 CREATE TABLE meetings(id uuid PRIMARY KEY,user_id uuid NOT NULL,company_id uuid,title text NOT NULL,meeting_type text,objective text,
  meeting_date date,modality text,start_time time,end_time time,location text,participants text[],status text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE meeting_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES meetings(id),
  profile_id uuid NOT NULL REFERENCES usuarios(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(meeting_id,profile_id));
 CREATE TABLE meeting_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES meetings(id),
  actor_id uuid NOT NULL,event_type text NOT NULL,summary text NOT NULL,metadata jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX meeting_events_meeting_created_idx ON meeting_events(meeting_id,created_at);
 CREATE TABLE meeting_report_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES meetings(id),
  version int NOT NULL,generated_by uuid NOT NULL,generated_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,
  snapshot jsonb NOT NULL,UNIQUE(meeting_id,version));
 CREATE TABLE task_email_outbox(id uuid PRIMARY KEY,activity_id uuid NOT NULL,recipient_id uuid NOT NULL,event text NOT NULL,status text NOT NULL,
  provider_message_id text,error text,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,claimed_at timestamptz,sequence_id bigint NOT NULL);
 INSERT INTO usuarios VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','QA Creator','QA','Creator','creator@example.test');
 INSERT INTO meetings(id,user_id,title,meeting_date,start_time,end_time,location) VALUES
  ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Untouched QA history','2026-10-12','10:00','11:00','QA'),
  ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','Untouched NULL-date history',NULL,NULL,NULL,NULL);
 INSERT INTO meeting_report_versions(meeting_id,version,generated_by,snapshot) VALUES
  ('44444444-4444-4444-8444-444444444444',1,'22222222-2222-4222-8222-222222222222','{"date":null}');`)
const up=await readFile('supabase/pending/20261012173000_meetings_mail_storage.sql','utf8')
const down=await readFile('supabase/rollback/20261012173000_meetings_mail_storage.sql','utf8')
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
let checks=0
const check=x=>{assert.ok(x);checks++}
const business=()=>scalar("SELECT json_build_object('meetings',(SELECT json_agg(m ORDER BY id) FROM meetings m),'users',(SELECT json_agg(u ORDER BY id) FROM usuarios u),'participants',(SELECT json_agg(p ORDER BY id) FROM meeting_participants p),'events',(SELECT json_agg(e ORDER BY id) FROM meeting_events e),'reports',(SELECT json_agg(r ORDER BY id) FROM meeting_report_versions r),'tasks',(SELECT json_agg(t ORDER BY id) FROM task_email_outbox t))::text")
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
// Real lifecycle triggers with a NULL date. Roll back synthetic actions, not mail schema.
await db.exec('BEGIN')
const nullMid='55555555-5555-4555-8555-555555555555'
await db.query(`INSERT INTO meetings(id,user_id,title,meeting_date) VALUES($1,'22222222-2222-4222-8222-222222222222','QA NULL date',NULL)`,[nullMid])
await db.query(`INSERT INTO meeting_events(meeting_id,actor_id,event_type,summary,metadata)
 VALUES($1,'22222222-2222-4222-8222-222222222222','meeting_created','Synthetic NULL-date creation','{}')`,[nullMid])
let nullMail=(await db.query('SELECT kind,payload FROM meeting_mail_events WHERE meeting_id=$1',[nullMid])).rows[0]
check(nullMail.kind==='created')
check(nullMail.payload.subject==='Convocatoria de reunión: QA NULL date')
check(typeof nullMail.payload.text==='string' && nullMail.payload.text.includes('Fecha: Sin fecha'))
check(nullMail.payload.date===null)
await db.query("UPDATE meetings SET title='QA NULL date updated' WHERE id=$1",[nullMid])
await db.exec('SET CONSTRAINTS ALL IMMEDIATE')
nullMail=(await db.query("SELECT kind,payload FROM meeting_mail_events WHERE meeting_id=$1 AND kind='changed'",[nullMid])).rows[0]
check(nullMail.payload.subject==='Actualización de reunión: QA NULL date updated')
check(typeof nullMail.payload.text==='string' && nullMail.payload.text.includes('Fecha: Sin fecha'))
check(await scalar('SELECT meeting_date IS NULL FROM meetings WHERE id=$1',[nullMid])===true)
await db.exec('ROLLBACK')
check(await business()===before)
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
