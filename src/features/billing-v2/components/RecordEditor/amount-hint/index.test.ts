import { describe, it, expect } from 'vitest'
import amountHint from './index'

const BLANKS = ['', '   ', '\t', ' ']

describe('amountHint', () => {
  // The whole reason the column is nullable: a blank figure is not an obligation of nothing.
  it('calls every flavour of blank an unknown amount, never a zero', () => {
    BLANKS.forEach((raw) => expect(amountHint(raw)).toBe('billing.amount.unknown'))
  })

  it('calls a typed zero an explicit zero', () => {
    expect(amountHint('0')).toBe('billing.amount.zero')
    expect(amountHint('0.00')).toBe('billing.amount.zero')
    expect(amountHint(' 0 ')).toBe('billing.amount.zero')
  })

  it('says what a written figure will be stored as', () => {
    expect(amountHint('1250.40')).toBe('billing.amount.set')
    expect(amountHint('0.01')).toBe('billing.amount.set')
  })
})
