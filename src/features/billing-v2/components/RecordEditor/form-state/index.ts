import type { BillingV2Record } from '@/shared/data'
import values from '@/features/billing-v2/domain/record-values'
import type { RecordForm } from '../types'

const BLANK: Omit<RecordForm, 'recordType'> = {
  scheduledOn: '', scheduledTime: '', title: '', category: '',
  paymentStatus: values.paymentStatus.enum.pending, payeeLabel: '', amount: '',
  eventTypeLabel: '', noteText: '', noteMonth: '', closingApprovalFollowUp: false,
}

/** The boxes a record opens with: empty for a new one —due on `day` when it was started from a
 *  calendar day—, filled from the row for an existing one. */
export default function recordForm(record: BillingV2Record | null, day = ''): RecordForm {
  if (!record) return { ...BLANK, scheduledOn: day, recordType: values.recordType.enum.payment }
  const { record_type, scheduled_on, scheduled_time, title, category } = record
  const { payment_status, payee_label, amount, event_type_label } = record
  const { note_text, note_month, closing_approval_follow_up } = record
  const form = {
    ...BLANK, recordType: record_type, scheduledOn: scheduled_on ?? '',
    scheduledTime: scheduled_time ?? '', title: title ?? '', category: category ?? '',
    paymentStatus: payment_status ?? BLANK.paymentStatus, payeeLabel: payee_label ?? '',
    amount: amount ?? '', eventTypeLabel: event_type_label ?? '', noteText: note_text ?? '',
    noteMonth: note_month ?? '', closingApprovalFollowUp: closing_approval_follow_up,
  }
  return form
}

// Turns a stored row back into the boxes it was typed in, and opens a new record as an unpaid
// payment. Every absent column comes back as empty text and never as a zero: an unknown amount
// has to reach the box as nothing typed, because the moment it arrives as `0` the editor has
// invented a confirmed obligation of nothing — the exact mistake Canva's own form makes.
