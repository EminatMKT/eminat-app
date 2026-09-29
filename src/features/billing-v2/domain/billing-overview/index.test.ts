import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingOverview from './index'

const payment = (fields: Parameters<typeof fixtureRecord>[0]) => fixtureRecord(fields)

describe('billingOverview', () => {
  it('totals the known amounts of whichever payments it is handed', () => {
    const records = [
      payment({ id: '1', amount: '100.50' }),
      payment({ id: '2', amount: '49.50' }),
    ]
    expect(billingOverview(records).totalCents).toBe(15000)
  })

  it('counts a null amount as unknown and leaves it out of every total', () => {
    const records = [payment({ id: '1', amount: null })]
    const result = billingOverview(records)
    expect(result.totalCents).toBe(0)
    expect(result.unknownCount).toBe(1)
  })

  // isPayment/index.test.ts already covers events and month notes both; this only needs to
  // prove billingOverview actually filters through it.
  it('ignores a non-payment record — the caller filters by date, not this', () => {
    const records = [payment({ id: '1', record_type: 'event', amount: null })]
    expect(billingOverview(records).totalCents).toBe(0)
  })

  it('splits the total into paid and pending, scheduled/pending_approval in neither', () => {
    const records = [
      payment({ id: '1', payment_status: 'paid', amount: '10.00' }),
      payment({ id: '2', payment_status: 'pending', amount: '5.00' }),
      payment({ id: '3', payment_status: 'scheduled', amount: '7.00' }),
    ]
    const result = billingOverview(records)
    expect(result.paidCents).toBe(1000)
    expect(result.pendingCents).toBe(500)
    expect(result.totalCents).toBe(2200)
  })
})
