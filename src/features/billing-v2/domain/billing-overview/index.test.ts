import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingOverview from './index'

const payment = (fields: Parameters<typeof fixtureRecord>[0]) => fixtureRecord(fields)

describe('billingOverview', () => {
  it('sums the known amounts of whichever payments it is handed', () => {
    const records = [
      payment({ id: '1', amount: '100.50' }),
      payment({ id: '2', amount: '49.50' }),
    ]
    expect(billingOverview(records).subtotalCents).toBe(15000)
  })

  it('counts an explicit zero amount as known, not unknown', () => {
    const records = [payment({ id: '1', amount: '0' })]
    const result = billingOverview(records)
    expect(result.subtotalCents).toBe(0)
    expect(result.unknownCount).toBe(0)
  })

  it('counts a null amount as unknown and excludes it from the subtotal', () => {
    const records = [payment({ id: '1', amount: null })]
    const result = billingOverview(records)
    expect(result.subtotalCents).toBe(0)
    expect(result.unknownCount).toBe(1)
  })

  it('ignores events and month notes entirely — the caller already filtered by date, not this', () => {
    const records = [
      payment({
        id: '1',
        record_type: 'event',
        amount: null,
        category: null,
        payment_status: null,
      }),
      payment({
        id: '2',
        record_type: 'month_note',
        note_month: '2026-09-01',
        scheduled_on: null,
        amount: null,
        category: null,
        payment_status: null,
      }),
    ]
    const result = billingOverview(records)
    expect(result.unknownCount).toBe(0)
    expect(result.byCategory.payroll).toBe(0)
  })

  it('tallies every payment by category and by status, known amount or not', () => {
    const records = [
      payment({
        id: '1',
        category: 'payroll',
        payment_status: 'paid',
        amount: '10.00',
      }),
      payment({
        id: '2',
        category: 'contractors_vendors',
        payment_status: 'pending',
        amount: null,
      }),
    ]
    const result = billingOverview(records)
    expect(result.byCategory).toEqual({ payroll: 1, contractors_vendors: 1 })
    expect(result.byStatus.paid).toBe(1)
    expect(result.byStatus.pending).toBe(1)
  })
})
