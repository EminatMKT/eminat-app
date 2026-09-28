import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import monthOverview from './index'

const payment = (fields: Parameters<typeof fixtureRecord>[0]) => fixtureRecord(fields)

describe('monthOverview', () => {
  it('sums known amounts scheduled inside the given month', () => {
    const records = [
      payment({ id: '1', scheduled_on: '2026-09-05', amount: '100.50' }),
      payment({ id: '2', scheduled_on: '2026-09-20', amount: '49.50' }),
    ]
    expect(monthOverview(records, '2026-09-23').subtotalCents).toBe(15000)
  })

  it('includes the first and the last day of the month', () => {
    const records = [
      payment({ id: '1', scheduled_on: '2026-09-01', amount: '1.00' }),
      payment({ id: '2', scheduled_on: '2026-09-30', amount: '2.00' }),
    ]
    expect(monthOverview(records, '2026-09-15').subtotalCents).toBe(300)
  })

  it('excludes a payment scheduled in an adjacent month', () => {
    const records = [
      payment({ id: '1', scheduled_on: '2026-08-31', amount: '999.00' }),
      payment({ id: '2', scheduled_on: '2026-10-01', amount: '999.00' }),
    ]
    expect(monthOverview(records, '2026-09-15').subtotalCents).toBe(0)
  })

  it('counts an explicit zero amount as known, not unknown', () => {
    const records = [payment({ id: '1', scheduled_on: '2026-09-05', amount: '0' })]
    const result = monthOverview(records, '2026-09-15')
    expect(result.subtotalCents).toBe(0)
    expect(result.unknownCount).toBe(0)
  })

  it('counts a null amount as unknown and excludes it from the subtotal', () => {
    const records = [payment({ id: '1', scheduled_on: '2026-09-05', amount: null })]
    const result = monthOverview(records, '2026-09-15')
    expect(result.subtotalCents).toBe(0)
    expect(result.unknownCount).toBe(1)
  })

  it('ignores events and month notes entirely', () => {
    const records = [
      payment({ id: '1', record_type: 'event', scheduled_on: '2026-09-05', amount: null, category: null, payment_status: null }),
      payment({ id: '2', record_type: 'month_note', note_month: '2026-09-01', scheduled_on: null, amount: null, category: null, payment_status: null }),
    ]
    const result = monthOverview(records, '2026-09-15')
    expect(result.unknownCount).toBe(0)
    expect(result.byCategory.payroll).toBe(0)
  })

  it('tallies every payment in the month by category and by status, known amount or not', () => {
    const records = [
      payment({ id: '1', scheduled_on: '2026-09-05', category: 'payroll', payment_status: 'paid', amount: '10.00' }),
      payment({ id: '2', scheduled_on: '2026-09-10', category: 'contractors_vendors', payment_status: 'pending', amount: null }),
    ]
    const result = monthOverview(records, '2026-09-15')
    expect(result.byCategory).toEqual({ payroll: 1, contractors_vendors: 1 })
    expect(result.byStatus.paid).toBe(1)
    expect(result.byStatus.pending).toBe(1)
  })
})
