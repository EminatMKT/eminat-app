import { describe, it, expect, vi } from 'vitest'

const userPref = vi.fn()
vi.mock('../useUserPreference', () => ({ useUserPreference: (...args: unknown[]) => userPref(...args) }))

describe('useTabPreference', () => {
  it('scopes the preference key to the module and narrows it to the given values', async () => {
    const { default: useTabPreference } = await import('./index')
    useTabPreference('billing', 'records', ['records', 'overview'])
    expect(userPref).toHaveBeenCalledTimes(1)
    const [key, initial, isValid] = userPref.mock.calls[0]
    expect(key).toBe('tab-billing')
    expect(initial).toBe('records')
    expect(isValid('overview')).toBe(true)
    expect(isValid('bogus')).toBe(false)
  })
})
