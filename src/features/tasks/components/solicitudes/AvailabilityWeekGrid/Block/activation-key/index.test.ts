import { describe, expect, it } from 'vitest'
import isActivationKey from '.'

describe('isActivationKey', () => {
  it('activates on Enter', () => {
    expect(isActivationKey('Enter')).toBe(true)
  })

  it('activates on Space', () => {
    expect(isActivationKey(' ')).toBe(true)
  })

  it('does not activate on an unrelated key', () => {
    expect(isActivationKey('Tab')).toBe(false)
  })
})
