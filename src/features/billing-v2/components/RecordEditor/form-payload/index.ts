import values from '@/features/billing-v2/domain/record-values'
import type { RecordForm } from '../types'

function blankToNull(value: string): string | null {
  return value.trim() ? value : null
}

function paymentPayload(form: RecordForm) {
  const { scheduledOn, scheduledTime, title, category, paymentStatus } = form
  const { payeeLabel, amount, noteText, closingApprovalFollowUp } = form
  const row = {
    recordType: values.recordType.enum.payment, scheduledOn,
    scheduledTime: blankToNull(scheduledTime), title, category, paymentStatus, payeeLabel,
    amount: amount.trim() || null, noteText: blankToNull(noteText), closingApprovalFollowUp,
  }
  return row
}

function eventPayload(form: RecordForm) {
  const { scheduledOn, scheduledTime, title, eventTypeLabel, noteText } = form
  const row = {
    recordType: values.recordType.enum.event, scheduledOn,
    scheduledTime: blankToNull(scheduledTime), title,
    eventTypeLabel: blankToNull(eventTypeLabel), noteText: blankToNull(noteText),
  }
  return row
}

function notePayload({ noteMonth, noteText }: RecordForm) {
  const row = { recordType: values.recordType.enum.month_note, noteMonth, noteText }
  return row
}

/** The mutation the form is describing, still unvalidated: only the columns its subtype owns. */
export default function formPayload(form: RecordForm): unknown {
  const kind = values.recordType.enum
  if (form.recordType === kind.payment) return paymentPayload(form)
  if (form.recordType === kind.event) return eventPayload(form)
  return notePayload(form)
}

// One builder per subtype, because the columns are not optional variations of one row: a payment
// without a payee and an event carrying an amount are both refused by the database, and the
// difference has to be made here rather than argued about at the far end of a round trip.
// A blank optional box becomes null and never an empty string, which is the value the column
// expects; the amount is the one that matters, since blank there means unknown and not zero.
