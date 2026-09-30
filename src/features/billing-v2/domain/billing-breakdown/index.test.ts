import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingBreakdown from './index'

const payment = (fields: Parameters<typeof fixtureRecord>[0]) => fixtureRecord(fields)

describe('billingBreakdown', () => {
  it('tallies the full status distribution by amount, zeroed members included', () => {
    const records = [
      payment({ id: '1', payment_status: 'paid', amount: '10.00' }),
      payment({ id: '2', payment_status: 'pending', amount: '5.00' }),
    ]
    expect(billingBreakdown(records).byStatusCents).toEqual({
      pending: 500,
      scheduled: 0,
      pending_approval: 0,
      paid: 1000,
    })
  })

  it('breaks paid and pending down by category, each in its own tally', () => {
    const records = [
      payment({
        id: '1',
        category: 'payroll',
        payment_status: 'paid',
        amount: '10',
      }),
      payment({
        id: '2',
        category: 'contractors_vendors',
        payment_status: 'pending',
        amount: '5',
      }),
    ]
    const result = billingBreakdown(records)
    expect(result.paidByCategoryCents).toEqual({ payroll: 1000, contractors_vendors: 0 })
    expect(result.pendingByCategoryCents).toEqual({ payroll: 0, contractors_vendors: 500 })
  })

  it('skips an unknown amount in every breakdown — nothing to weigh it by', () => {
    const records = [payment({
      id: '1',
      category: 'payroll',
      payment_status: 'paid',
      amount: null,
    })]
    const result = billingBreakdown(records)
    expect(result.byStatusCents.paid).toBe(0)
    expect(result.paidByCategoryCents.payroll).toBe(0)
  })
})
