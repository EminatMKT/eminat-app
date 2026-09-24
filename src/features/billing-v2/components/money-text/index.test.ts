import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import moneyText from './index'

const LOCALE = 'en-US'
const USD = 'USD'
const priced = (amount: string | null) => ({ amount, currency_code: USD }) as BillingV2Record

describe('moneyText', () => {
  // An unknown amount has no figure to show; the caller says "unknown" in its own words.
  it('gives no figure for an unknown amount', () => {
    expect(moneyText(priced(null), LOCALE)).toBeNull()
  })

  it('shows an explicit zero as a real amount of zero', () => {
    expect(moneyText(priced('0'), LOCALE)).toBe('$0.00')
  })

  it('formats a stored decimal in the currency of its row', () => {
    expect(moneyText(priced('1234.5'), LOCALE)).toBe('$1,234.50')
  })
})
