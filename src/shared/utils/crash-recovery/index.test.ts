import { describe, it, expect } from 'vitest'
import decideCrashRecovery from './index'
import { RELOAD, SHOW, RELOAD_WINDOW_MS, CHUNK_LOAD_ERROR_NAME as CHUNK_NAME } from './constants/recovery'

// The failure seen on 25/09/2026 in the dev overlay, copied as it came.
const LAYOUT_CHUNK = 'Loading chunk app/(app)/layout failed.\n(timeout: http://localhost:3000/_next/static/chunks/app/(app)/layout.js)'
const CSS_CHUNK = 'Loading CSS chunk 185 failed.\n(/_next/static/css/185.css)'
const RENDER_BUG = 'Cannot read properties of undefined'
const PLAIN_NAME = 'Error'
const NOW = 1_000_000_000

const failure = (message: string, name = PLAIN_NAME) => Object.assign(new Error(message), { name })
const decide = (error: Error, lastReloadAt = 0) => decideCrashRecovery({ error, lastReloadAt, now: NOW })

describe('decideCrashRecovery', () => {
  it('reloads once when a chunk did not arrive', () => {
    expect(decide(failure(LAYOUT_CHUNK, CHUNK_NAME))).toBe(RELOAD)
  })

  // A minified production build may not keep the error's name: the message still says it.
  it('recognises a chunk failure by its message alone, JS or CSS', () => {
    expect(decide(failure(LAYOUT_CHUNK))).toBe(RELOAD)
    expect(decide(failure(CSS_CHUNK))).toBe(RELOAD)
  })

  it('recognises a chunk failure by its name alone', () => {
    expect(decide(failure(RENDER_BUG, CHUNK_NAME))).toBe(RELOAD)
  })

  // The guard: a reload that did not fix it must not be followed by another one.
  it('shows the screen when it already reloaded a moment ago', () => {
    expect(decide(failure(LAYOUT_CHUNK, CHUNK_NAME), NOW - 1)).toBe(SHOW)
    expect(decide(failure(LAYOUT_CHUNK, CHUNK_NAME), NOW - RELOAD_WINDOW_MS)).toBe(SHOW)
  })

  // A tab left open across a later deploy deserves its own reload, not the old one's verdict.
  it('reloads again once the last reload is out of the window', () => {
    expect(decide(failure(LAYOUT_CHUNK, CHUNK_NAME), NOW - RELOAD_WINDOW_MS - 1)).toBe(RELOAD)
  })

  it('never reloads on its own for an error that is not a missing chunk', () => {
    expect(decide(failure(RENDER_BUG))).toBe(SHOW)
  })
})
