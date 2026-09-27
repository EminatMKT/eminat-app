import { describe, it, expect } from 'vitest'
import amountHint from './index'

const BLANKS = ['', '   ', '\t', ' ']

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

  // A figure the schema refuses is not about to be stored: there is nothing to preview.
  it('says nothing about a figure that cannot be stored', () => {
    expect(amountHint('abc')).toBeNull()
    expect(amountHint('1250.405')).toBeNull()
  })
})
