import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tick, endpoint } from './meta-leads-scheduler.mjs'
const env = { LILLY_META_SCHEDULER_ENABLED: 'true', CRON_SECRET: 'synthetic' }
test('disabled and missing credential never contact LILLY', async () => {
 await tick({env:{},fetchImpl:()=>assert.fail('network forbidden')})
 await assert.rejects(()=>tick({env:{LILLY_META_SCHEDULER_ENABLED:'true'},fetchImpl:()=>assert.fail('network forbidden')}),/binding required/)
})
test('fixed authenticated endpoint, no redirects, and counts-only logs', async () => {
 const logs=[];let count=0
 await tick({env,log:x=>logs.push(x),fetchImpl:async(url,options)=>{
  count++;assert.equal(url,endpoint);assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,'Bearer synthetic')
  return {ok:true,json:async()=>({processed:2,recovered:2,failed:0,deferred:0,reason:null,secret:'must not log'})}
 }})
 assert.equal(count,1);assert.deepEqual(JSON.parse(logs[0]),{event:'meta_leads_scheduler',processed:2,recovered:2})
 assert.ok(!logs.join().includes('synthetic')&&!logs.join().includes('must not log'))
})
test('errors, disabled worker, and review-required outcomes fail without resend',async()=>{
 for(const result of [{reason:'META_RECOVERY_NOT_CONFIGURED'}, {processed:1,recovered:0,failed:1,deferred:0,reason:'REVIEW_REQUIRED'},{}])
  await assert.rejects(()=>tick({env,fetchImpl:async()=>({ok:true,json:async()=>result})}),/requires review/)
 let count=0;await assert.rejects(()=>tick({env,fetchImpl:async()=>{count++;return {ok:false,status:503,json:()=>assert.fail('error body')}}}),/returned an error/)
 assert.equal(count,1)
})
test('PR cannot invoke worker and Production stays explicitly gated',async()=>{
 const workflow=await readFile('.github/workflows/meta-leads-scheduler.yml','utf8')
 assert.ok(workflow.includes("github.event_name != 'pull_request'"));assert.ok(workflow.includes("github.ref == 'refs/heads/main'"))
 assert.ok(workflow.includes("vars.LILLY_META_SCHEDULER_ENABLED == 'true'"));assert.ok(workflow.includes('cancel-in-progress: false'))
 assert.ok(workflow.includes('secrets.CRON_SECRET'));assert.ok(!workflow.includes('SUPABASE')&&!workflow.includes('META_APP_SECRET'))
})
