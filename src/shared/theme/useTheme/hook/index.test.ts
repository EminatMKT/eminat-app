import {
  describe,
  it,
  expect,
  beforeEach,
} from 'vitest'
import { readPref, writePref, oneOf } from '@/shared/hooks/usePersistedState'

// useTheme itself is a thin usePersistedState wrapper (no React render harness exists in this
// repo's tests — see usePersistedState.test.ts); this exercises the same persistence contract
// it relies on, under a neutral key (the real one, 'eminat-theme', is private to ./index).
const TEST_KEY = 'theme-test-key'
const isThemeName = oneOf('light', 'dark')
const store = new Map<string, string>()
const fakeStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value) },
}
const fakeStorageDescriptor = { value: fakeStorage, configurable: true }

beforeEach(() => store.clear())
Object.defineProperty(globalThis, 'localStorage', fakeStorageDescriptor)

describe('theme/useTheme persistence contract', () => {
  it('nothing stored falls back to light', () => {
    expect(readPref(TEST_KEY, 'light', isThemeName)).toBe('light')
  })

  it('a stored theme round-trips', () => {
    writePref(TEST_KEY, 'dark')
    expect(readPref(TEST_KEY, 'light', isThemeName)).toBe('dark')
  })

  it('a theme that stopped being valid falls back to light', () => {
    writePref(TEST_KEY, 'solarized')
    expect(readPref(TEST_KEY, 'light', isThemeName)).toBe('light')
  })
})
