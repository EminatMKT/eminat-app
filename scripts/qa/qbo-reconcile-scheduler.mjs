// Scheduling only: event claims, provider reads, payment checks and audit stay in LILLY.
import { pathToFileURL } from 'node:url'

export const endpoint = 'https://app.stratixsolutions.us/api/sales-native/quickbooks/reconcile'

export async function tick({ env = process.env, fetchImpl = fetch, log = console.info } = {}) {
  if (env.LILLY_QBO_RECONCILE_SCHEDULER_ENABLED !== 'true') {
    log(JSON.stringify({ event: 'qbo_reconcile_scheduler', state: 'disabled' }))
    return
  }
  if (!env.CRON_SECRET) throw new Error('Existing CRON_SECRET binding required')
  // Exactly one request. The durable LILLY event queue handles retries.
  const response = await fetchImpl(endpoint, {
    method: 'GET', redirect: 'error', cache: 'no-store',
    headers: { authorization: 'Bearer ' + env.CRON_SECRET },
    signal: AbortSignal.timeout(55_000),
  })
  if (!response.ok) {
    log(JSON.stringify({ event: 'qbo_reconcile_scheduler', state: 'http_error', status: response.status }))
    throw new Error('LILLY reconciliation returned an error; inspect server logs')
  }
  const result = await response.json()
  if (!result || !['processed', 'retry', 'ignored'].every(
    key => Number.isSafeInteger(result[key]) && result[key] >= 0
  )) throw new Error('LILLY reconciliation response incomplete')
  // Never log response bodies, patient or invoice identifiers, or credentials.
  log(JSON.stringify({ event: 'qbo_reconcile_scheduler', state: 'completed',
    processed: result.processed, retry: result.retry, ignored: result.ignored }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  tick().catch(() => {
    console.error(JSON.stringify({ event: 'qbo_reconcile_scheduler', state: 'failed',
      action: 'Inspect LILLY reconciliation and GitHub secret binding; no retry attempted' }))
    process.exitCode = 1
  })
}
