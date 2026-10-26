import { timingSafeEqual } from 'node:crypto'

/** Dedicated worker credential cannot authorize other LILLY cron endpoints. */
export function workerAuthorized(request: Request, allowLegacyCron = false) {
  const supplied = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
  const matches = (secret: string | undefined) => {
    const expected = Buffer.from(secret ?? '')
    return expected.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied)
  }
  return matches(process.env.LILLY_QBO_RECONCILE_WORKER_SECRET) ||
    allowLegacyCron && matches(process.env.CRON_SECRET)
}
