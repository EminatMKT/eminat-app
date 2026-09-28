import { describe, it, expect } from 'vitest'
import fixtureRecord from './index'

describe('fixtureRecord', () => {
  // The default is the case most suites start from: a payment nobody has paid, amount unknown.
  it('starts as an unpaid payment whose amount is unknown', () => {
    const row = fixtureRecord()
    expect(row.record_type).toBe('payment')
    expect(row.payment_status).toBe('pending')
    expect(row.amount).toBeNull()
    expect(row.currency_code).toBe('USD')
  })

  it('takes the fields a suite cares about over the defaults', () => {
    const row = fixtureRecord({ id: 'late', scheduled_on: '2026-09-01' })
    expect(row.id).toBe('late')
    expect(row.scheduled_on).toBe('2026-09-01')
    expect(row.title).toBe(fixtureRecord().title)
  })
})
