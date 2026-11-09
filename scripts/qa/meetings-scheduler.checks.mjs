import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tick, endpoint } from './meetings-scheduler.mjs'

const enabled = { MEETINGS_SCHEDULER_ENABLED: 'true', CRON_SECRET: 'synthetic-secret' }
const healthy = { warning: null, deliveries: [{ status: 'sent', email: 'controlled@example.test', provider_message_id: 'qa-provider' }], reconciliation: { warning: null, recorded: 1 } }

test('disabled gate never calls LILLY', async () => {
  await tick({ env: {}, fetchImpl: () => assert.fail('Network forbidden'), log: () => {} })
})
test('missing existing credential fails before network', async () => {
  await assert.rejects(() => tick({ env: { MEETINGS_SCHEDULER_ENABLED: 'true' }, fetchImpl: () => assert.fail('Network forbidden') }), /binding required/)
})
test('one authenticated request uses fixed LILLY endpoint, no redirects, safe logs', async () => {
  let calls = 0; const logs = []
  await tick({ env: enabled, log: x => logs.push(x), fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, endpoint)
    assert.equal(options.method, 'GET')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.authorization, 'Bearer synthetic-secret')
    assert.ok(options.signal instanceof AbortSignal)
    return { ok: true, json: async () => healthy }
  } })
  assert.equal(calls, 1)
  assert.deepEqual(JSON.parse(logs[0]), { event: 'meetings_scheduler', state: 'completed', accepted: 1, failed: 0, reconciled: 1 })
  assert.ok(!logs.join('').includes('synthetic-secret'))
  assert.ok(!logs.join('').includes('controlled@example.test'))
  assert.ok(!logs.join('').includes('qa-provider'))
})
test('HTTP errors never retry or log the response body', async () => {
  for (const status of [401, 429, 503]) {
    let calls = 0
    await assert.rejects(() => tick({ env: enabled, log: () => {}, fetchImpl: async () => {
      calls++; return { ok: false, status, json: () => assert.fail('Do not read error body') }
    } }), /worker returned an error/)
    assert.equal(calls, 1)
  }
})
test('ambiguous transport failure never resends', async () => {
  let calls = 0
  await assert.rejects(() => tick({ env: enabled, fetchImpl: async () => { calls++; throw new Error('timeout') } }), /timeout/)
  assert.equal(calls, 1)
})
test('disabled/incomplete worker or reconciliation cannot report success', async () => {
  for (const result of [{}, { ...healthy, warning: 'pending' }, { ...healthy, reconciliation: { disabled: true } }, { ...healthy, reconciliation: { warning: 'pending' } }]) {
    await assert.rejects(() => tick({ env: enabled, fetchImpl: async () => ({ ok: true, json: async () => result }) }), /not active or incomplete/)
  }
})
test('single Meetings trigger; Tasks and gated Native Sales crons preserved', async () => {
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'))
  assert.deepEqual(vercel.crons, [
    { path: '/api/tasks/notifications/process', schedule: '0 3 * * *' },
    { path: '/api/sales-native/reports/process', schedule: '5 13 * * *' },
    { path: '/api/sales-native/social/meta/recover', schedule: '10 14 * * *' },
    { path: '/api/sales-native/patient-email/process', schedule: '15 12 * * *' },
  ])
  assert.deepEqual(vercel.git.deploymentEnabled, { '**': false, 'feature/lilly-calendar': true, main: false })
  const workflow = await readFile('.github/workflows/meetings-scheduler.yml', 'utf8')
  assert.equal((workflow.match(/- cron:/g) || []).length, 1)
  assert.ok(workflow.includes("'2-59/5 * * * *'"))
  assert.ok(workflow.includes('cancel-in-progress: false'))
  assert.ok(workflow.includes("github.ref == 'refs/heads/main'"))
  assert.ok(workflow.includes("github.event_name != 'pull_request'"))
  assert.ok(workflow.includes('secrets.CRON_SECRET'))
  assert.ok(!workflow.includes('RESEND_API_KEY') && !workflow.includes('SUPABASE'))
})
