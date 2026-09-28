import { describe, it, expect } from 'vitest'
import values from '@/features/billing-v2/domain/record-values'
import moneyText from './index'

const LOCALE = 'en-US'
const [USD] = values.currency.options
const priced = (amount: string | null) => ({ amount, currency_code: USD })

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

  // The editor previews a typed figure before it has a row: the currency falls back to the domain's.
  it('formats a figure that has no row yet, in the reader\'s locale', () => {
    expect(moneyText({ amount: '1.5', currency_code: null }, 'es-EC')).toMatch(/^\$\s?1,50$/)
  })
})
