import { afterEach, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { TABLES } from '@/shared/schema'
import countUserTasks from '.'

const URL_BASE = 'http://db.test'
const KEY = 'service-key'
const USER_ID = 'u1'
const RANGE_HEADER = 'content-range'
const FETCH = 'fetch'
const RANGE_BY_TABLE: Record<string, string> = {
  [TABLES.actividadResponsables]: '*/3',
  [TABLES.actividades]: '*/0',
}
const EXPECTED_COUNTS = { taskCount: 3, requestedCount: 0 }
const EXPECTED_FILTERS = [
  `/${TABLES.actividadResponsables}?select=usuario_id&usuario_id=eq.${USER_ID}`,
  `/${TABLES.actividades}?select=solicitante_id&solicitante_id=eq.${USER_ID}`,
]

const fakeFetch = (requested: string[]) => async (input: RequestInfo | URL) => {
  const url = new URL(input.toString())
  const table = url.pathname.split('/').pop() ?? ''
  requested.push(`/${table}${decodeURIComponent(url.search)}`)
  const init = { status: 200, headers: { [RANGE_HEADER]: RANGE_BY_TABLE[table] } }
  return new Response(null, init)
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('counts responsible tasks in the join table and requested ones in actividades', async () => {
  const requested: string[] = []
  vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(requested))
  const db = createClient(URL_BASE, KEY)
  const counts = await countUserTasks(db, USER_ID)
  expect(counts).toEqual(EXPECTED_COUNTS)
  expect(requested.sort()).toEqual(EXPECTED_FILTERS.sort())
})
