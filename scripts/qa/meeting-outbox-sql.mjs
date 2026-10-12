// Run: PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/qa/meeting-outbox-sql.mjs
// Ephemeral PostgreSQL/WASM only; this script has no network, Production URL or provider credential.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const path = process.env.PGLITE_MODULE
if (!path) throw new Error('Set PGLITE_MODULE to an isolated PGlite installation')
const { PGlite } = await import(path)
const db = new PGlite()
let checks = 0
const check = (value) => { assert.ok(value); checks++ }
const mid='11111111-1111-4111-8111-111111111111', auth='22222222-2222-4222-8222-222222222222'
const users=['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666']
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE usuarios(id uuid PRIMARY KEY, auth_id uuid, nombre_display text,nombre text,apellido text,email text);
CREATE TABLE meetings(id uuid PRIMARY KEY,user_id uuid,title text,meeting_date date,start_time time,end_time time,location text,participants jsonb,status text,created_at timestamptz DEFAULT now());
CREATE TABLE meeting_participants(meeting_id uuid,profile_id uuid,PRIMARY KEY(meeting_id,profile_id));
CREATE TABLE meeting_events(id uuid DEFAULT gen_random_uuid(),meeting_id uuid,actor_id uuid,event_type text);
INSERT INTO usuarios VALUES
('${users[0]}','${auth}','Creator',NULL,NULL,'CREATOR@example.test'),
('${users[1]}',NULL,'Attendee',NULL,NULL,'attendee@example.test'),
('${users[2]}',NULL,'Absent',NULL,NULL,'absent@example.test'),
('${users[3]}',NULL,'Added',NULL,NULL,'added@example.test');
INSERT INTO meetings(id,user_id,title,meeting_date,start_time,end_time,location,participants,status) VALUES('77777777-7777-4777-8777-777777777777','${auth}','Historic untouched','2026-10-12','10:00','11:00','Office','[]','activa');`)
await db.exec(await readFile(new URL('../../docs/sql/meetings-notification-outbox.review.sql',import.meta.url),'utf8'))
check((await db.query('select count(*)::int n from meeting_mail_events')).rows[0].n===0)
check((await db.query('select title,status from meetings')).rows[0].title==='Historic untouched')
await db.exec(`INSERT INTO meetings(id,user_id,title,meeting_date,start_time,end_time,location,participants,status) VALUES('${mid}','${auth}','New QA Meeting','2026-10-12','10:00','11:00','Office','[]','activa')`)
await db.exec(`INSERT INTO meeting_participants VALUES('${mid}','${users[1]}'),('${mid}','${users[2]}');
INSERT INTO meeting_events(meeting_id,actor_id,event_type) VALUES('${mid}','${auth}','meeting_created');`)
const scalar=async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0]
check(await scalar('select count(*)::int from meeting_mail_events')===1)
check(await scalar('select count(*)::int from meeting_mail_deliveries')===3)
check(await scalar("select count(*)::int from meeting_mail_deliveries where email='absent@example.test'")===1)
await db.exec(`INSERT INTO meeting_events(meeting_id,actor_id,event_type) VALUES('${mid}','${auth}','meeting_created');
UPDATE meetings SET participants='["Attendee"]',status='finalizada' WHERE id='${mid}';`)
check(await scalar('select count(*)::int from meeting_mail_events')===1)
await db.exec(`UPDATE meetings SET meeting_date='2026-10-13' WHERE id='${mid}'`)
check(await scalar('select count(*)::int from meeting_mail_events')===2)
await db.exec(`BEGIN;
UPDATE meetings SET location='New office' WHERE id='${mid}';
DELETE FROM meeting_participants WHERE meeting_id='${mid}' AND profile_id='${users[1]}';
INSERT INTO meeting_participants VALUES('${mid}','${users[3]}');
COMMIT;`)
check(await scalar('select count(*)::int from meeting_mail_events')===3)
check(await scalar("select count(*)::int from meeting_mail_deliveries d join meeting_mail_events e on d.event_id=e.id where e.payload->>'location'='New office'")===3)
const enqueue=async(key,recipients,payload={from:'QA',subject:'QA',text:'QA'})=>scalar('select enqueue_meeting_mail($1,$2,$3,$4,$5)',[mid,key,'minutes',JSON.stringify(payload),JSON.stringify(recipients)])
const claim=async(eid)=> (await db.query('select * from claim_meeting_mail($1,50,NULL)',[eid])).rows
const finish=async(job,outcome,id=null)=>scalar('select finish_meeting_mail($1,$2,$3,$4,$5)',[job.id,job.claim_id,outcome,id,outcome==='accepted'?null:'QA controlled failure'])
const recipients=[{name:'Absent',email:' Absent@EXAMPLE.test '},{name:'Duplicate',email:'absent@example.test'},{name:'Creator',email:'creator@example.test'}]
const eid=await enqueue('qa-minutes',recipients)
await enqueue('qa-minutes',recipients,{from:'QA',subject:'Payload replay must not mutate',text:'different'})
check(await scalar('select count(*)::int from meeting_mail_deliveries where event_id=$1',[eid])===2)
check(await scalar("select payload->>'subject' from meeting_mail_events where id=$1",[eid])==='QA')
const [one,two]=await Promise.all([claim(eid),claim(eid)])
const jobs=[...one,...two]
check(jobs.length===2 && new Set(jobs.map(j=>j.id)).size===2)
check(await finish(jobs[0],'accepted','provider-qa-1')===true)
check(await finish(jobs[1],'retry')===true)
await db.query("update meeting_mail_deliveries set next_attempt_at=now()-interval '1 minute' where id=$1",[jobs[1].id])
const retry=(await claim(eid))[0]
check(retry.id===jobs[1].id && retry.attempts===2)
check(await finish(jobs[1],'accepted','stale-claim')===false)
check(await finish(retry,'accepted','provider-qa-2')===true)
await db.query("update meeting_mail_deliveries set first_claimed_at=now()-interval '25 hours' where event_id=$1",[eid])
await enqueue('qa-minutes',recipients)
check((await claim(eid)).length===0)
check(await scalar("select count(*)::int from meeting_mail_deliveries where event_id=$1 and status='accepted' and provider_message_id is not null",[eid])===2)
const unknown=await enqueue('qa-unknown',[recipients[0]])
const unknownJob=(await claim(unknown))[0]
await finish(unknownJob,'unknown')
check((await claim(unknown)).length===0)
const expired=await enqueue('qa-expired',[recipients[0]])
const expiredJob=(await claim(expired))[0]
await finish(expiredJob,'retry')
await db.query("update meeting_mail_deliveries set first_claimed_at=now()-interval '25 hours',next_attempt_at=now()-interval '1 minute' where id=$1",[expiredJob.id])
check((await claim(expired)).length===0)
check(await scalar('select status from meeting_mail_deliveries where id=$1',[expiredJob.id])==='unknown')
const abandoned=await enqueue('qa-abandoned',[recipients[0]])
const abandonedJob=(await claim(abandoned))[0]
await db.query("update meeting_mail_deliveries set claimed_at=now()-interval '12 minutes' where id=$1",[abandonedJob.id])
check((await claim(abandoned)).length===0)
check(await scalar('select status from meeting_mail_deliveries where id=$1',[abandonedJob.id])==='unknown')
const dead=await enqueue('qa-max-attempts',[recipients[0]])
await db.query('update meeting_mail_deliveries set attempts=4 where event_id=$1',[dead])
const deadJob=(await claim(dead))[0]
await finish(deadJob,'retry')
check(await scalar('select status from meeting_mail_deliveries where id=$1',[deadJob.id])==='dead')
check(await scalar("select count(*)::int from meeting_mail_attempts where outcome='accepted' and provider_message_id is not null")===2)
await db.exec("UPDATE meetings SET location='Controlled change to legacy QA fixture' WHERE id='77777777-7777-4777-8777-777777777777'")
check(await scalar("select count(*)::int from meeting_mail_events where meeting_id='77777777-7777-4777-8777-777777777777' and kind='changed'")===1)
await db.exec('SET ROLE service_role')
await assert.rejects(()=>db.query("UPDATE meeting_mail_events SET payload='{}'")); checks++
await db.exec('RESET ROLE')
await db.exec('SET ROLE authenticated')
await assert.rejects(()=>db.query('select * from meeting_mail_deliveries')); checks++
await assert.rejects(()=>db.query('select enqueue_meeting_mail($1,$2,$3,$4,$5)',[mid,'forged','minutes','{}','[]'])); checks++
await db.exec('RESET ROLE')
await db.close()
console.log(JSON.stringify({result:'PASS',checks,engine:'isolated PostgreSQL via PGlite',emailsSent:0,productionAccess:false}))

