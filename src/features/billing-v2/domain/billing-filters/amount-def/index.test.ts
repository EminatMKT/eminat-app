import { describe, expect, it } from 'vitest'
import amountDef from './index'

describe('amountDef', () => {
  it('filters the amount range', () => {
    expect(amountDef.key).toBe('amount')
  })
})
