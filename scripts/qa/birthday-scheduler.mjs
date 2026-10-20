import { pathToFileURL } from 'node:url'

export async function tick({ env = process.env, fetchImpl = fetch, log = console.info } = {}) {
  if (env.BIRTHDAY_SCHEDULER_ENABLED !== 'true') return
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET requerido')
  const response = await fetchImpl('https://app.stratixsolutions.us/api/directory/birthdays/process', {
    method: 'GET', redirect: 'error', cache: 'no-store',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(55_000),
  })
  if (!response.ok) throw new Error(`Birthday worker HTTP ${response.status}`)
  const result = await response.json()
  if (!Number.isInteger(result.sent) || !Number.isInteger(result.review)) throw new Error('Respuesta inválida')
  log(JSON.stringify({ event: 'birthday_scheduler', date: result.date, sent: result.sent, review: result.review, skipped: result.skipped }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  tick().catch(() => { console.error('Birthday scheduler failed; inspect LILLY logs'); process.exitCode = 1 })
}
