import { describe, expect, it } from 'vitest'
import { addMembershipMonths, isSaleDuration, quoteMembership } from './pricing'

describe('native Corazón Salud pricing', () => {
  it('collects two months up front for month-to-month and keeps regular fixed pricing', () => {
    expect(quoteMembership('ESSENTIAL', 'INDIVIDUAL', 'MONTHLY')).toMatchObject({
      monthlyCents: 5999, totalCents: 11998, initialMonths: 2, visitFeeCents: 2500,
    })
    expect(quoteMembership('MAX', 'FAMILY', 'MONTHLY')).toMatchObject({
      monthlyCents: 14999, totalCents: 29998, initialMonths: 2, visitFeeCents: 0,
    })
    expect(quoteMembership('PLUS', 'FAMILY', '6M')).toMatchObject({
      monthlyCents: 10999, totalCents: 65994, initialMonths: 6, includedVisits: 4,
    })
  })

  it('does not offer historical 2M as a new duration', () => {
    expect(isSaleDuration('2M')).toBe(false)
    expect(isSaleDuration('3M')).toBe(true)
  })

  it('clips end-of-month dates and rejects malformed dates', () => {
    expect(addMembershipMonths('2026-01-31', 2)).toBe('2026-03-31')
    expect(addMembershipMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(() => addMembershipMonths('2026-02-31', 1)).toThrow('INVALID_MEMBERSHIP_DATE')
  })
})
