import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import recordFields from './index'

const PAYEE = 'EMC team'
const read = (row: BillingV2Record) => recordFields(row, (key) => key, 'en-US')

describe('recordFields', () => {
  it('reads every field of a payment, each on its own', () => {
    const fields = read(fixtureRecord({ amount: '150', payee_label: PAYEE, scheduled_time: '15:00:00' }))
    expect(fields).toMatchObject({
      date: 'Sep 30, 2026', time: '3:00 PM', concept: 'Payroll', payee: PAYEE,
      amount: '$150.00', status: 'billing.status.pending', marker: '',
    })
  })

  // A missing amount is said to be unknown; it never reads as a confirmed zero.
  it('says an unknown amount is unknown instead of drawing a zero', () => {
    expect(read(fixtureRecord()).amount).toBe('billing.amount.missing')
  })

  it('keeps an explicit zero as an amount', () => {
    expect(read(fixtureRecord({ amount: '0' })).amount).toBe('$0.00')
  })

  it('names the closing approval marker only when it is set', () => {
    expect(read(fixtureRecord({ closing_approval_follow_up: true })).marker).toBe('billing.field.followUp')
    expect(read(fixtureRecord()).marker).toBe('')
  })

  // An absent field is an empty string, so its slot on a card stays in place instead of moving.
  it('leaves an absent field empty rather than missing', () => {
    const fields = read(fixtureRecord({ record_type: 'event', payment_status: null, payee_label: null }))
    expect(fields.payee).toBe('')
    expect(fields.status).toBe('')
    expect(fields.time).toBe('')
  })
})
