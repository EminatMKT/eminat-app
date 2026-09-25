import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RELOAD, SHOW, RELOAD_STAMP_KEY } from '@/shared/utils'
import useCrashRecovery from './index'

// No DOM in this suite: the effect runs on the spot and the state setter is a spy.
const { setStep } = vi.hoisted(() => ({ setStep: vi.fn() }))
vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, setStep],
  useEffect: (effect: () => void) => effect(),
}))

const MISSING_CHUNK = 'Loading chunk app/(app)/layout failed.\n(timeout: http://localhost:3000/_next/static/chunks/app/(app)/layout.js)'
const RENDER_BUG = 'Cannot read properties of undefined'
const BLOCKED = 'storage blocked'

const reload = vi.fn()
let stored: Map<string, string>
const tabStorage = {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => { stored.set(key, value) },
}
const blockedStorage = {
  getItem: () => { throw new Error(BLOCKED) },
  setItem: () => { throw new Error(BLOCKED) },
}
const stubWindow = (storage: typeof tabStorage) => vi.stubGlobal('window', { sessionStorage: storage, location: { reload } })

beforeEach(() => {
  stored = new Map()
  reload.mockClear()
  setStep.mockClear()
  stubWindow(tabStorage)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('useCrashRecovery', () => {
  it('reloads once for a missing chunk, and stamps the tab first', () => {
    useCrashRecovery(new Error(MISSING_CHUNK))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(stored.has(RELOAD_STAMP_KEY)).toBe(true)
    expect(setStep).toHaveBeenCalledWith(RELOAD)
  })

  // The page that comes back from that reload fails the same way: this time it stays put.
  it('shows the screen when the reload did not fix it', () => {
    useCrashRecovery(new Error(MISSING_CHUNK))
    useCrashRecovery(new Error(MISSING_CHUNK))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setStep).toHaveBeenLastCalledWith(SHOW)
  })

  it('shows the screen for any other error without reloading', () => {
    useCrashRecovery(new Error(RENDER_BUG))
    expect(reload).not.toHaveBeenCalled()
    expect(stored.size).toBe(0)
    expect(setStep).toHaveBeenCalledWith(SHOW)
  })

  // Without somewhere to write the stamp there is no guard, so there is no automatic reload.
  it('never reloads when the tab cannot keep the stamp', () => {
    stubWindow(blockedStorage)
    useCrashRecovery(new Error(MISSING_CHUNK))
    expect(reload).not.toHaveBeenCalled()
    expect(setStep).toHaveBeenCalledWith(SHOW)
  })
})
