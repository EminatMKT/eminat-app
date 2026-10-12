// Isolated PostgreSQL only; zero network, zero email, zero Production access.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE)
const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE meeting_mail_deliveries(id uuid PRIMARY KEY,status text,provider_message_id text,accepted_at timestamptz);
 CREATE TABLE task_email_outbox(id uuid PRIMARY KEY,status text,provider_message_id text,sent_at timestamptz);
 INSERT INTO meeting_mail_deliveries VALUES('11111111-1111-4111-8111-111111111111','accepted','provider-meeting',now());
 INSERT INTO task_email_outbox VALUES('22222222-2222-4222-8222-222222222222','sent','provider-task',now());`)
await db.exec(await readFile('docs/sql/meetings-delivery-reconciliation.review.sql','utf8'))
const scalar = async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0]
let checks=0
const check = value => { assert.ok(value); checks++ }
const mid='11111111-1111-4111-8111-111111111111',tid='22222222-2222-4222-8222-222222222222'
const record = (source,id,provider,state) => scalar('select record_meeting_notification_delivery($1,$2,$3,$4)',[source,id,provider,state])
check((await db.query('select * from list_meeting_notification_reconciliation(25)')).rows.length===2)
check(await record('meeting',mid,'wrong-provider','delivered')===false)
check(await record('meeting',mid,'provider-meeting','delivered')===true)
check(await record('meeting',mid,'provider-meeting','delivered')===true)
check(await scalar('select count(*)::int from meeting_notification_delivery_log')===1)
await record('meeting',mid,'provider-meeting','sent')
check(await scalar("select state from meeting_notification_delivery_state where source='meeting'")==='delivered')
await record('task',tid,'provider-task','bounced')
await record('task',tid,'provider-task','sent')
check(await scalar("select state from meeting_notification_delivery_state where source='task'")==='bounced')
check(await scalar('select status from task_email_outbox')==='sent')
check(await scalar('select status from meeting_mail_deliveries')==='accepted')
await db.exec("UPDATE meeting_notification_delivery_state SET checked_at=now()-interval '6 minutes'")
check((await db.query('select * from list_meeting_notification_reconciliation(25)')).rows.length===1)
await record('meeting',mid,'provider-meeting','failed')
check(await scalar("select state from meeting_notification_delivery_state where source='meeting'")==='failed')
check((await db.query('select * from list_meeting_notification_reconciliation(25)')).rows.length===0)
await assert.rejects(()=>record('meeting',mid,'provider-meeting','invented')); checks++
await db.exec('SET ROLE authenticated')
await assert.rejects(()=>db.query('select * from meeting_notification_delivery_state')); checks++
await assert.rejects(()=>record('task',tid,'provider-task','delivered')); checks++
await db.exec('RESET ROLE')
await db.close()
console.log(JSON.stringify({result:'PASS',checks,emailsSent:0,productionAccess:false}))
