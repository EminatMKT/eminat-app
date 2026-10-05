import { describe, it, expect } from 'vitest'
import CLOSED from './index'

describe('closed combobox state', () => {
  it('is shut with nothing highlighted', () => {
    expect(CLOSED.open).toBe(false)
    expect(CLOSED.active).toBe(-1)
  })
})
