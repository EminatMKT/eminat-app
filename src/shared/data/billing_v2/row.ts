import billingRecordInput from '@/features/billing-v2/domain/record-input'
import values from '@/features/billing-v2/domain/record-values'
import type { BillingEventInput, BillingMonthNoteInput, BillingPaymentInput, BillingRecordInput } from '@/features/billing-v2/domain/types'
import type { BillingV2Absent, BillingV2Write } from './types'

const STORED_CURRENCY = 'USD'
const ABSENT: BillingV2Absent = {
  scheduled_on: null, scheduled_time: null, note_month: null, title: null, category: null,
  payment_status: null, payee_label: null, amount: null, currency_code: null,
  event_type_label: null, note_text: null, closing_approval_follow_up: false,
}

function paymentRow(input: BillingPaymentInput): BillingV2Write {
  const { recordType, scheduledOn, scheduledTime, title, category } = input
  const { paymentStatus, payeeLabel, amount, noteText, closingApprovalFollowUp } = input
  const row = {
    ...ABSENT, record_type: recordType, scheduled_on: scheduledOn,
    scheduled_time: scheduledTime, title, category,
    payment_status: paymentStatus, payee_label: payeeLabel,
    amount, currency_code: STORED_CURRENCY, note_text: noteText,
    closing_approval_follow_up: closingApprovalFollowUp,
  }
  return row
}

function eventRow(input: BillingEventInput): BillingV2Write {
  const { recordType, scheduledOn, scheduledTime, title, eventTypeLabel, noteText } = input
  const row = {
    ...ABSENT, record_type: recordType, scheduled_on: scheduledOn,
    scheduled_time: scheduledTime, title, event_type_label: eventTypeLabel, note_text: noteText,
  }
  return row
}

function noteRow({ recordType, noteMonth, noteText }: BillingMonthNoteInput): BillingV2Write {
  const row = { ...ABSENT, record_type: recordType, note_month: noteMonth, note_text: noteText }
  return row
}

/** Validates a mutation and turns it into the exact columns this layer writes: the one place
 *  the stored currency is decided, and one the server-owned columns never reach. */
export default function billingRow(input: BillingRecordInput): BillingV2Write {
  // With `strict` off in tsconfig, zod infers every nullable key as optional, so the parsed
  // value no longer matches the DTO it validated. The schema's own suite proves they are one
  // shape; naming it back is what keeps the blank-to-null transform instead of dropping it.
  const parsed = billingRecordInput.parse(input) as BillingRecordInput
  if (parsed.recordType === values.recordType.enum.payment) return paymentRow(parsed)
  if (parsed.recordType === values.recordType.enum.event) return eventRow(parsed)
  return noteRow(parsed)
}
