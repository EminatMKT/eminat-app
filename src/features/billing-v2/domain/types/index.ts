type BillingScheduledInput = {
  scheduledOn: string
  scheduledTime: string | null
  title: string
  noteText: string | null
}

/** What the browser sends to create or edit a payment. `amount` is a decimal string, never a
 * JS number, and null there means the figure is unknown rather than zero. */
export type BillingPaymentInput = BillingScheduledInput & {
  recordType: 'payment'
  category: 'payroll' | 'contractors_vendors'
  paymentStatus: 'pending' | 'scheduled' | 'pending_approval' | 'paid'
  payeeLabel: string
  amount: string | null
  closingApprovalFollowUp: boolean
}

/** What the browser sends to create or edit a calendar event. */
export type BillingEventInput = BillingScheduledInput & {
  recordType: 'event'
  eventTypeLabel: string | null
}

/** What the browser sends to create or edit the single note a month carries. */
export type BillingMonthNoteInput = {
  recordType: 'month_note'
  noteMonth: string
  noteText: string
}

/** Every mutation the billing v2 editor can send, discriminated by `recordType`. */
export type BillingRecordInput =
  | BillingPaymentInput
  | BillingEventInput
  | BillingMonthNoteInput

// The three creation shapes are separate types rather than one partial record, so an event
// carrying an amount or a payment without a payee fails to compile instead of failing a CHECK
// constraint at the far end of a round trip. The browser never sends the actor or the
// timestamps: `created_by_id`, `created_at` and `updated_at` are resolved on the server, and
// `currency_code` is the server-side USD constant, which is why none of them appear here.
// `recordType` is immutable, so an update carries the record's id plus its subtype shape
// minus that field. What payments and events genuinely share is named once as the scheduled
// half of a record; month notes share none of it, because a month is not a day.
