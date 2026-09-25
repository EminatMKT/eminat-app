import { describe, it, expect } from 'vitest'
import billingAmount from '@/features/billing-v2/domain/amount-schema'
import amountText from './index'

// What a person types → what the strict domain schema is handed.
const NORMALIZED: ReadonlyArray<readonly [string, string]> = [
  ['1250,40', '1250.40'],
  ['1.250,40', '1250.40'],
  ['1,250.40', '1250.40'],
  ['1250.40', '1250.40'],
  ['1.250', '1250'],
  ['1,250', '1250'],
  ['1.250.000', '1250000'],
  ['1 250,40', '1250.40'],
  [' 12 ', '12'],
  ['0,50', '0.50'],
  ['0.500', '0.500'],
  ['', ''],
  ['   ', ''],
]

// Typed values the normalizer passes through untouched, so the domain schema refuses them.
const STILL_REFUSED = ['-5', 'abc', '1250.405', '1.25.0', '12,34,5']

describe('amountText', () => {
  it('turns every way of writing an amount into the one the schema reads', () => {
    for (const [typed, expected] of NORMALIZED) expect(amountText(typed)).toBe(expected)
  })

  // The ambiguous one: a single separator followed by exactly three digits, after a group of
  // one to three digits that does not start with zero, is a thousands separator.
  it('reads «1.250» as one thousand two hundred and fifty, never as 1.25', () => {
    expect(amountText('1.250')).toBe('1250')
    expect(amountText('12.500')).toBe('12500')
    expect(amountText('1250.405')).toBe('1250.405')
    expect(amountText('0.500')).toBe('0.500')
  })

  it('hands the schema valid text for every accepted spelling', () => {
    for (const [typed, expected] of NORMALIZED) {
      if (expected) expect(billingAmount.parse(amountText(typed))).toBe(expected)
    }
  })

  it('leaves what it cannot read for the schema to refuse', () => {
    for (const typed of STILL_REFUSED) expect(billingAmount.safeParse(amountText(typed)).success).toBe(false)
  })
})
