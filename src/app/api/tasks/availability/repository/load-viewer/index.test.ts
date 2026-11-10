import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  ANON_KEY,
  AUTH_USER_ID,
  TEST_ORIGIN,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import loadViewer from '.'

const PROFILE_ID = 'user-1'

function fetchAnswering(rows: unknown[]) {
  const answer = vi.fn(async () => new Response(JSON.stringify(rows)))
  const fetchExtras = { preconnect: vi.fn() }

  return Object.assign(answer, fetchExtras)
}

function clientWith(fetch: ReturnType<typeof fetchAnswering>) {
  const options = { global: { fetch } }

  return createClient(TEST_ORIGIN, ANON_KEY, options)
}

describe('loadViewer', () => {
  it("resolves the caller's usuarios.id when the profile is active", async () => {
    const activeProfileRows = [{ id: PROFILE_ID }]
    const db = clientWith(fetchAnswering(activeProfileRows))

    expect(await loadViewer(db, AUTH_USER_ID)).toBe(PROFILE_ID)
  })

  it('returns null when no active profile matches', async () => {
    const noProfileRows: unknown[] = []
    const db = clientWith(fetchAnswering(noProfileRows))

    expect(await loadViewer(db, AUTH_USER_ID)).toBeNull()
  })

  it('returns null without querying when the caller carries no auth user id', async () => {
    const noRows: unknown[] = []
    const fetch = fetchAnswering(noRows)

    expect(await loadViewer(clientWith(fetch), undefined)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
