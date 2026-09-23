import { describe, expect, it } from 'vitest'
import type { BillingEventInput, BillingMonthNoteInput, BillingPaymentInput } from '@/features/billing-v2/domain/types'
import billingRow from './row'

const PAYMENT: BillingPaymentInput = {
  recordType: 'payment', scheduledOn: '2026-09-30', scheduledTime: '09:30',
  title: 'September payroll', category: 'payroll', paymentStatus: 'pending',
  payeeLabel: 'Operations team', amount: '1234.50', noteText: null,
  closingApprovalFollowUp: true,
}

const EVENT: BillingEventInput = {
  recordType: 'event', scheduledOn: '2026-09-30', scheduledTime: null,
  title: 'Closing review', eventTypeLabel: null, noteText: null,
}

const NOTE: BillingMonthNoteInput = {
  recordType: 'month_note', noteMonth: '2026-09-01', noteText: 'Closes on the fifth',
}

describe('billing v2 row', () => {
  it('supplies the stored currency, which no caller ever chooses', () => {
    expect(billingRow(PAYMENT).currency_code).toBe('USD')
  })

  it('never writes the columns the database owns', () => {
    const columns = Object.keys(billingRow(PAYMENT))
    expect(columns).not.toContain('created_by_id')
    expect(columns).not.toContain('created_at')
    expect(columns).not.toContain('updated_at')
  })

  it('clears every column the subtype does not use', () => {
    const event = billingRow(EVENT)
    expect(event.currency_code).toBeNull()
    expect(event.amount).toBeNull()
    expect(event.payment_status).toBeNull()
    const note = billingRow(NOTE)
    expect(note.scheduled_on).toBeNull()
    expect(note.title).toBeNull()
    expect(note.closing_approval_follow_up).toBe(false)
  })

  it('keeps an unknown amount apart from an explicit zero', () => {
    expect(billingRow({ ...PAYMENT, amount: null }).amount).toBeNull()
    expect(billingRow({ ...PAYMENT, amount: '0' }).amount).toBe('0')
  })

  it('refuses everything the domain schema refuses', () => {
    expect(() => billingRow({ ...PAYMENT, amount: '10.005' })).toThrow()
    expect(() => billingRow({ ...PAYMENT, payeeLabel: '   ' })).toThrow()
    expect(() => billingRow({ ...EVENT, scheduledOn: '2026-02-30' })).toThrow()
    expect(() => billingRow({ ...NOTE, noteMonth: '2026-09-15' })).toThrow()
  })
})
