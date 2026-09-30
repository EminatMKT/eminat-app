import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import isPayment from './index'

describe('isPayment', () => {
  it('is true for a payment record', () => {
    expect(isPayment(fixtureRecord({ record_type: 'payment' }))).toBe(true)
  })

  it('is false for an event or a month note', () => {
    expect(isPayment(fixtureRecord({ record_type: 'event' }))).toBe(false)
    expect(isPayment(fixtureRecord({ record_type: 'month_note' }))).toBe(false)
  })
})
