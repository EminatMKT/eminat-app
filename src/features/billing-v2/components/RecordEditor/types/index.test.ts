import { expect, it } from 'vitest'
import type { RecordForm } from './index'

const MARKER = 'closingApprovalFollowUp'
const form: RecordForm = {
  recordType: 'payment',
  scheduledOn: '2026-09-30', scheduledTime: '', title: 'Nómina',
  category: 'payroll', paymentStatus: 'pending', payeeLabel: 'Equipo EMC', amount: '',
  eventTypeLabel: '', noteText: '', noteMonth: '',
  closingApprovalFollowUp: false,
}

it('holds a box for every column any of the three subtypes can carry', () => {
  expect(Object.keys(form).sort()).toEqual([
    'amount', 'category', MARKER, 'eventTypeLabel', 'noteMonth',
    'noteText', 'payeeLabel', 'paymentStatus', 'recordType', 'scheduledOn',
    'scheduledTime', 'title',
  ])
})

// Every box is text while it is being typed, so nothing is coerced on the way in: an empty
// amount stays empty instead of becoming a number, which is where zero would be invented.
it('keeps every editable box as text, and only the marker as a flag', () => {
  const typed = Object.entries(form).filter(([name]) => name !== MARKER)
  typed.forEach(([, value]) => expect(typeof value).toBe('string'))
  expect(typeof form.closingApprovalFollowUp).toBe('boolean')
})

it('refuses at compile time a record type that is not one of the three', () => {
  // @ts-expect-error 'invoice' is not a billing v2 record type
  const wrong: RecordForm = { ...form, recordType: 'invoice' }
  expect(wrong.title).toBe(form.title)
})
