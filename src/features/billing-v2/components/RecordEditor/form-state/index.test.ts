import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import recordForm from './index'

const STORED: BillingV2Record = {
  id: 'r1', record_type: 'payment', scheduled_on: '2026-09-30', scheduled_time: '09:15',
  note_month: null, title: 'Nómina quincena', category: 'payroll', payment_status: 'scheduled',
  payee_label: 'Equipo EMC', amount: '1250.40', currency_code: 'USD', event_type_label: null,
  note_text: null, closing_approval_follow_up: true, created_by_id: null,
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
}
const NOTE: BillingV2Record = {
  ...STORED, id: 'r2', record_type: 'month_note', scheduled_on: null, scheduled_time: null,
  note_month: '2026-09-01', title: null, category: null, payment_status: null,
  payee_label: null, amount: null, currency_code: null, note_text: 'Cierre del mes',
}

describe('recordForm', () => {
  it('opens a new record as a payment nobody has paid yet', () => {
    const form = recordForm(null)
    expect(form.recordType).toBe('payment')
    expect(form.paymentStatus).toBe('pending')
    expect(form.category).toBe('')
    expect(form.closingApprovalFollowUp).toBe(false)
  })

  // Pressing a day on the calendar opens a new payment already due on that day.
  it('opens a new record on the day it was started from', () => {
    expect(recordForm(null, '2026-09-14').scheduledOn).toBe('2026-09-14')
    expect(recordForm(STORED, '2026-09-14').scheduledOn).toBe('2026-09-30')
  })

  // An unknown amount must arrive at the text box as nothing typed, not as a zero.
  it('leaves an unknown amount blank instead of turning it into a zero', () => {
    expect(recordForm(null).amount).toBe('')
    expect(recordForm(NOTE).amount).toBe('')
    expect(recordForm({ ...STORED, amount: '0' }).amount).toBe('0')
  })

  it('carries a stored payment back into the boxes it was typed in', () => {
    const form = recordForm(STORED)
    expect(form.scheduledOn).toBe('2026-09-30')
    expect(form.scheduledTime).toBe('09:15')
    expect(form.payeeLabel).toBe('Equipo EMC')
    expect(form.amount).toBe('1250.40')
    expect(form.closingApprovalFollowUp).toBe(true)
  })

  it('carries a stored month note, and every absent column as empty text', () => {
    const form = recordForm(NOTE)
    expect(form.recordType).toBe('month_note')
    expect(form.noteMonth).toBe('2026-09-01')
    expect(form.noteText).toBe('Cierre del mes')
    expect(form.title).toBe('')
    expect(form.payeeLabel).toBe('')
  })
})
