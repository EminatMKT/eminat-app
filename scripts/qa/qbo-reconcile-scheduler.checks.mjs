import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tick, endpoint } from './qbo-reconcile-scheduler.mjs'

const enabled = { LILLY_QBO_RECONCILE_SCHEDULER_ENABLED: 'true', CRON_SECRET: 'synthetic-secret' }

test('disabled scheduler makes no request', async () => {
  await tick({ env: {}, fetchImpl: () => assert.fail('Network forbidden'), log: () => {} })
})

test('missing credential fails before network', async () => {
  await assert.rejects(() => tick({
    env: { LILLY_QBO_RECONCILE_SCHEDULER_ENABLED: 'true' },
    fetchImpl: () => assert.fail('Network forbidden'),
  }), /binding required/)
})

test('one authenticated request uses fixed endpoint without redirects or sensitive logs', async () => {
  let calls = 0
  const logs = []
  await tick({ env: enabled, log: value => logs.push(value), fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, endpoint)
    assert.equal(options.method, 'GET')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.authorization, 'Bearer synthetic-secret')
    assert.ok(options.signal instanceof AbortSignal)
    return { ok: true, json: async () => ({ processed: 1, retry: 0, ignored: 0,
      patientEmail: 'controlled@example.test' }) }
  } })
  assert.equal(calls, 1)
  assert.deepEqual(JSON.parse(logs[0]), {
    event: 'qbo_reconcile_scheduler', state: 'completed',
    processed: 1, retry: 0, ignored: 0,
  })
  assert.ok(!logs.join('').includes('synthetic-secret'))
  assert.ok(!logs.join('').includes('controlled@example.test'))
})

test('HTTP and ambiguous transport failures never retry', async () => {
  for (const status of [401, 429, 503]) {
    let calls = 0
    await assert.rejects(() => tick({ env: enabled, log: () => {},
      fetchImpl: async () => { calls++; return { ok: false, status,
        json: () => assert.fail('Do not read error body') } },
    }), /returned an error/)
    assert.equal(calls, 1)
  }
  let calls = 0
  await assert.rejects(() => tick({ env: enabled, fetchImpl: async () => {
    calls++; throw new Error('timeout')
  } }), /timeout/)
  assert.equal(calls, 1)
})

test('incomplete response cannot report success', async () => {
  for (const result of [{}, { processed: -1, retry: 0, ignored: 0 },
    { processed: 1, retry: '0', ignored: 0 }]) {
    await assert.rejects(() => tick({ env: enabled,
      fetchImpl: async () => ({ ok: true, json: async () => result }),
    }), /response incomplete/)
  }
})

test('Hobby cron configuration and protected GitHub scheduler contract', async () => {
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'))
  assert.ok(vercel.crons.every(item => item.schedule.split(' ')[0].match(/^\\d+$/)))
  assert.ok(!vercel.crons.some(item => item.path === '/api/sales-native/quickbooks/reconcile'))
  const workflow = await readFile('.github/workflows/qbo-reconcile-scheduler.yml', 'utf8')
  assert.ok(workflow.includes("'3-59/5 * * * *'"))
  assert.ok(workflow.includes('cancel-in-progress: false'))
  assert.ok(workflow.includes("github.ref == 'refs/heads/main'"))
  assert.ok(workflow.includes("github.event_name != 'pull_request'"))
  assert.ok(workflow.includes('secrets.CRON_SECRET'))
  assert.ok(workflow.includes("vars.LILLY_QBO_RECONCILE_SCHEDULER_ENABLED == 'true'"))
  assert.ok(!workflow.includes('SUPABASE') && !workflow.includes('LILLY_QBO_CLIENT_SECRET'))
})
