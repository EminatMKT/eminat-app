// Scheduler only: all claims, provider calls, reconciliation and retries stay in LILLY.
import { pathToFileURL } from 'node:url'

export const endpoint = 'https://app.stratixsolutions.us/api/meetings/notifications/process'

export async function tick({ env = process.env, fetchImpl = fetch, log = console.info } = {}) {
  if (env.MEETINGS_SCHEDULER_ENABLED !== 'true') {
    log(JSON.stringify({ event: 'meetings_scheduler', state: 'disabled' }))
    return
  }
  if (!env.CRON_SECRET) throw new Error('Existing CRON_SECRET binding required')
  // One request only. No HTTP retry: an uncertain result must use the durable outbox.
  // Refuse redirects so the existing bearer credential cannot reach another host.
  const response = await fetchImpl(endpoint, {
    method: 'GET', redirect: 'error', cache: 'no-store',
    headers: { authorization: 'Bearer ' + env.CRON_SECRET },
    signal: AbortSignal.timeout(55_000),
  })
  if (!response.ok) {
    log(JSON.stringify({ event: 'meetings_scheduler', state: 'http_error', status: response.status }))
    throw new Error('LILLY worker returned an error; inspect server logs')
  }
  const result = await response.json()
  if (!Array.isArray(result.deliveries) || !result.reconciliation || result.warning ||
      result.reconciliation.warning || result.reconciliation.disabled) {
    throw new Error('LILLY worker/reconciliation not active or incomplete')
  }
  // Never print response bodies, emails, recipient names, attachments or credentials.
  // Detailed provider message IDs and outcomes remain in LILLY's existing logs/storage.
  log(JSON.stringify({ event: 'meetings_scheduler', state: 'completed',
    accepted: result.deliveries.filter(row => row.status === 'sent').length,
    failed: result.deliveries.filter(row => row.status === 'failed').length,
    reconciled: result.reconciliation.recorded,
  }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  tick().catch(() => {
    console.error(JSON.stringify({ event: 'meetings_scheduler', state: 'failed',
      action: 'Inspect LILLY worker configuration/logs; no scheduler resend attempted' }))
    process.exitCode = 1
  })
}
