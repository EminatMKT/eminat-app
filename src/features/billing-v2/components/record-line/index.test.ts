import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import recordLine from './index'

const PAYEE = 'EMC team'
const KIND = 'Board'
const UNKNOWN = 'billing.amount.missing'
const MARKER = 'billing.field.followUp'
const concept = fixtureRecord().title ?? ''
const say = (row: BillingV2Record) => recordLine(row, (key) => key, 'en-US')

describe('recordLine', () => {
  it('says the concept, the payee, the amount and the status of a payment', () => {
    const line = say(fixtureRecord({ amount: '150', payee_label: PAYEE }))
    expect(line).toContain(concept)
    expect(line).toContain(PAYEE)
    expect(line).toContain('$150.00')
    expect(line).toContain('billing.status.pending')
  })

  // A missing amount is said to be unknown; it never reads as a confirmed zero.
  it('says an unknown amount is unknown instead of drawing a zero', () => {
    const line = say(fixtureRecord())
    expect(line).toContain(UNKNOWN)
    expect(line).not.toContain('$0.00')
  })

  it('keeps an explicit zero as an amount', () => {
    expect(say(fixtureRecord({ amount: '0' }))).toContain('$0.00')
  })

  it('shows the closing approval marker only when it is set', () => {
    expect(say(fixtureRecord({ closing_approval_follow_up: true }))).toContain(MARKER)
    expect(say(fixtureRecord())).not.toContain(MARKER)
  })

  it('names an event by its concept, its type and its time', () => {
    const line = say(fixtureRecord({
      record_type: 'event', category: null, payment_status: null, currency_code: null,
      event_type_label: KIND, scheduled_time: '15:00:00',
    }))
    expect(line).toContain(concept)
    expect(line).toContain(KIND)
    expect(line).toContain('3:00')
    expect(line).not.toContain(UNKNOWN)
  })
})
