import type { FieldErrors } from '@/features/billing-v2/components/RecordEditor/types'

const byField: FieldErrors = {
  scheduledOn: 'billing.error.scheduledOn', scheduledTime: 'billing.error.scheduledTime',
  title: 'billing.error.title', category: 'billing.error.category',
  paymentStatus: 'billing.error.paymentStatus', payeeLabel: 'billing.error.payeeLabel',
  amount: 'billing.error.amount', eventTypeLabel: 'billing.error.eventTypeLabel',
  noteText: 'billing.error.noteText', noteMonth: 'billing.error.noteMonth',
}

const ERROR_KEYS = { byField, tooLong: 'billing.error.tooLong', tooBigCode: 'too_big' } as const

/** The message each refused field shows under its own box, and the one for a text too long. */
export default ERROR_KEYS

// A field's own message says what it needs; a text past its column limit gets a different one,
// because the fix is to shorten it, not to fill it in. `too_big` is the zod issue code for that.
