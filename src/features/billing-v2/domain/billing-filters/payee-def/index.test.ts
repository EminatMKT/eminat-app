import { describe, expect, it } from 'vitest'
import payeeDef from './index'

describe('payeeDef', () => {
  it('filters the payee label', () => {
    expect(payeeDef.key).toBe('payee_label')
  })
})
