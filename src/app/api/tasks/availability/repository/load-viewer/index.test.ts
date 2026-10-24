import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import loadViewer from '.'

const URL_BASE = 'http://db.test'
const KEY = 'anon-key'
const AUTH_USER_ID = 'auth-1'
const FETCH = 'fetch'

function fakeFetch(rows: unknown[]) {
  return async () => {
    const responseBody = JSON.stringify(rows)
    return new Response(responseBody)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadViewer', () => {
  it("resolves the caller's usuarios.id when the profile is active", async () => {
    const activeProfileRows = [{ id: 'user-1' }]
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(activeProfileRows))
    const db = createClient(URL_BASE, KEY)
    const viewerId = await loadViewer(db, AUTH_USER_ID)
    expect(viewerId).toBe('user-1')
  })

  it('returns null when no active profile matches', async () => {
    const noProfileRows: unknown[] = []
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(noProfileRows))
    const db = createClient(URL_BASE, KEY)
    const viewerId = await loadViewer(db, AUTH_USER_ID)
    expect(viewerId).toBeNull()
  })

  it('returns null without querying when the caller carries no auth user id', async () => {
    const fetchSpy = vi.spyOn(globalThis, FETCH)
    const db = createClient(URL_BASE, KEY)
    const viewerId = await loadViewer(db, undefined)
    expect(viewerId).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
