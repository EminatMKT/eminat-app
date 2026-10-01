import { afterEach, describe, expect, it, vi } from 'vitest'
import storage from './index'

afterEach(() => vi.unstubAllGlobals())

describe('locale storage', () => {
  it.each(['es', 'en'])('preserves the existing raw %s preference', saved => {
    vi.stubGlobal('localStorage', { getItem: () => saved })
    expect(storage.read()).toBe(saved)
  })
  it.each([null, 'fr', '"en"'])('falls back for an invalid preference %s', saved => {
    vi.stubGlobal('localStorage', { getItem: () => saved })
    expect(storage.read()).toBe('es')
  })
  it('survives denied reads and writes without losing the session', () => {
    const denied = () => { throw new Error('Storage denied') }
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied })
    expect(storage.read()).toBe('es')
    expect(storage.write('en')).toBe(false)
  })
  it('writes the same raw format that existing installations read', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })
    expect(storage.write('en')).toBe(true)
    expect(setItem).toHaveBeenCalledWith('locale', 'en')
  })
})
