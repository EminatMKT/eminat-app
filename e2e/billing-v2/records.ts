import { expect, type APIRequestContext, type Page } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import { PASSWORD } from '../seed'
import { URL } from '../constants'
import rest from '../rest'
import * as K from './constants'
import type { IdRow, Row } from './types'

const LOCAL_HOSTS = [K.APP_HOME, K.LOCAL_API].map((address) => new globalThis.URL(address).hostname)
const created: string[] = []
let jwt = ''
function assertLocal(address: string) {
  if (!LOCAL_HOSTS.includes(new globalThis.URL(address).hostname)) throw new Error(`billing e2e refuses ${address}`)
}
assertLocal(URL)

const headers = () => ({ ...rest.como(jwt), Prefer: 'return=representation' })
const payment = (title: string, on: string, extra: Row = {}): Row => ({
  record_type: values.recordType.enum.payment, scheduled_on: on, title, payee_label: K.PAYEE,
  category: values.category.enum.payroll, payment_status: values.paymentStatus.enum.pending,
  amount: 100, currency_code: K.STORED_CURRENCY, ...extra,
})
const ids = async (request: APIRequestContext, query: string) => {
  const r = await request.get(`${K.RECORDS_TABLE}?select=id&${query}`, { headers: headers() })
  return ((await r.json()) as IdRow[]).map(({ id }) => id)
}
const find = (request: APIRequestContext, title: string) => ids(request, `title=eq.${encodeURIComponent(title)}`)
const foreignUnpaid = async (request: APIRequestContext) =>
  (await ids(request, 'record_type=eq.payment&payment_status=neq.paid')).filter((id) => !created.includes(id))
async function signIn(request: APIRequestContext) { jwt = await rest.token(request, K.HOLDER_EMAIL, PASSWORD) }
async function insert(request: APIRequestContext, row: Row) {
  const r = await request.post(K.RECORDS_TABLE, { headers: headers(), data: row })
  expect(r.status(), `insert of a synthetic ${String(row.record_type)}`).toBe(K.CREATED)
  created.push(...((await r.json()) as IdRow[]).map(({ id }) => id))
}
async function adopt(request: APIRequestContext, title: string) { created.push(...(await find(request, title))) }
async function clear(request: APIRequestContext) {
  if (created.length) await request.delete(`${K.RECORDS_TABLE}?id=in.(${created.join(',')})`, { headers: headers() })
  created.length = 0
}
const breakWrites = (page: Page) => page.route(K.RECORDS_WRITES, (route) =>
  K.WRITE_METHODS.includes(route.request().method()) ? route.fulfill(K.BROKEN_WRITE) : route.continue())

/** The synthetic records of one e2e run: written as the holder, deleted by the ids it stored. */
const records = { assertLocal, payment, signIn, insert, find, adopt, foreignUnpaid, clear, breakWrites }
export default records

// Rows go in through PostgREST with the holder's own token, because the insert trigger stamps
// the author from `auth.uid()`: a service key has none and the insert would fail.

// Cleanup deletes only the ids this run stored or adopted, never by pattern. The API address is
// checked on load, so a stray environment variable cannot point these writes at another host.
