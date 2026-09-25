import { describe, it, expect } from 'vitest'
import { CHUNK_LOAD_MESSAGE, RELOAD, SHOW, RELOAD_WINDOW_MS } from './index'

// webpack's wording for each kind of chunk, as Next 14 ships it.
const JS_CHUNK = 'Loading chunk 8069 failed.\n(error: http://localhost:3000/_next/static/chunks/8069.js)'
const CSS_CHUNK = 'Loading CSS chunk app/layout failed.\n(/_next/static/css/app/layout.css)'
const FETCH_FAILED = 'Failed to fetch'
// webpack gives up on a chunk after two minutes.
const CHUNK_TIMEOUT_MS = 120_000

describe('crash-recovery constants', () => {
  it('matches the message of a missing JS or CSS chunk', () => {
    expect(JS_CHUNK).toMatch(CHUNK_LOAD_MESSAGE)
    expect(CSS_CHUNK).toMatch(CHUNK_LOAD_MESSAGE)
  })

  // A failed API call is not a missing chunk, and reloading would not bring its data back.
  it('does not match a failed request', () => {
    expect(FETCH_FAILED).not.toMatch(CHUNK_LOAD_MESSAGE)
  })

  // A reload whose chunk hangs until the timeout still has to land inside the guard.
  it('keeps the guard longer than a chunk can take to fail', () => {
    expect(RELOAD_WINDOW_MS).toBeGreaterThan(CHUNK_TIMEOUT_MS)
  })

  it('names two different outcomes', () => {
    expect(RELOAD).not.toBe(SHOW)
  })
})
