import { describe, it, expect } from 'vitest'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'
import formPayload from './index'

const payment: RecordForm = {
  ...recordForm(null), scheduledOn: '2026-09-30', title: 'Nómina',
  category: 'payroll', payeeLabel: 'Equipo EMC',
}
const event: RecordForm = { ...payment, recordType: 'event', amount: '10', eventTypeLabel: 'Auditoría' }
const note: RecordForm = { ...payment, recordType: 'month_note', noteMonth: '2026-09-01', noteText: 'Cierre' }

describe('formPayload', () => {
  // The blank-versus-zero distinction is the point of the whole field.
  it('sends a blank amount as null and a typed zero as a zero', () => {
    expect(formPayload({ ...payment, amount: '   ' })).toMatchObject({ amount: null })
    expect(formPayload({ ...payment, amount: '0' })).toMatchObject({ amount: '0' })
    expect(formPayload({ ...payment, amount: '1250.40' })).toMatchObject({ amount: '1250.40' })
  })

  it('sends the optional clock and note as null when nothing was typed', () => {
    expect(formPayload(payment)).toMatchObject({ scheduledTime: null, noteText: null })
  })

  it('sends only the columns a payment owns', () => {
    expect(formPayload({ ...payment, closingApprovalFollowUp: true })).toEqual({
      recordType: 'payment', scheduledOn: '2026-09-30', scheduledTime: null, title: 'Nómina',
      category: 'payroll', paymentStatus: 'pending', payeeLabel: 'Equipo EMC', amount: null,
      noteText: null, closingApprovalFollowUp: true,
    })
  })

  it('sends only the columns an event owns, so an amount cannot ride along', () => {
    expect(formPayload(event)).toEqual({
      recordType: 'event', scheduledOn: '2026-09-30', scheduledTime: null,
      title: 'Nómina', eventTypeLabel: 'Auditoría', noteText: null,
    })
  })

  it('sends a month note as its month and its text, and nothing else', () => {
    expect(formPayload(note)).toEqual({ recordType: 'month_note', noteMonth: '2026-09-01', noteText: 'Cierre' })
  })
})
