import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tick } from './birthday-scheduler.mjs'

test('disabled scheduler makes no request', async () => {
  let calls = 0
  await tick({ env: {}, fetchImpl: async () => { calls++; throw Error('unexpected') } })
  assert.equal(calls, 0)
})

test('enabled scheduler calls only the production endpoint once without redirects', async () => {
  let calls = 0
  await tick({ env: { BIRTHDAY_SCHEDULER_ENABLED: 'true', CRON_SECRET: 'synthetic' },
    fetchImpl: async (url, options) => {
      calls++
      assert.equal(url, 'https://app.stratixsolutions.us/api/directory/birthdays/process')
      assert.equal(options.redirect, 'error')
      assert.equal(options.headers.authorization, 'Bearer synthetic')
      return { ok: true, json: async () => ({ date: '2026-10-13', sent: 0, review: 0, skipped: 0 }) }
    }, log: () => {} })
  assert.equal(calls, 1)
})
