import { pathToFileURL } from 'node:url'
export const endpoint = 'https://app.stratixsolutions.us/api/sales-native/social/meta/recover'
export async function tick({ env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  if (env.LILLY_META_SCHEDULER_ENABLED !== 'true') return
  if (!env.CRON_SECRET) throw new Error('Existing CRON_SECRET binding required')
  const response = await fetchImpl(endpoint, { method: 'GET', redirect: 'error',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(55_000) })
  if (!response.ok) throw new Error('Meta recovery worker returned an error')
  const result = await response.json()
  if (result.reason || !Number.isInteger(result.processed) || !Number.isInteger(result.recovered) ||
    !Number.isInteger(result.failed) || result.failed !== 0 || result.deferred !== 0)
    throw new Error('Meta recovery is not active or requires review')
  log(JSON.stringify({ event: 'meta_leads_scheduler', processed: result.processed, recovered: result.recovered }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  tick().catch(() => { console.error('META_RECOVERY_TICK_FAILED'); process.exitCode = 1 })
