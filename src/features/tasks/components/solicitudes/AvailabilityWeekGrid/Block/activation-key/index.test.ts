import { describe, expect, it } from 'vitest'
import { ENTER, TAB } from '@/shared/constants/dom'
import isActivationKey from '.'

const SPACE_KEY = ' '

describe('isActivationKey', () => {
  it('activates on Enter', () => {
    expect(isActivationKey(ENTER)).toBe(true)
  })

  it('activates on Space', () => {
    expect(isActivationKey(SPACE_KEY)).toBe(true)
  })

  it('does not activate on an unrelated key', () => {
    expect(isActivationKey(TAB)).toBe(false)
  })
})
