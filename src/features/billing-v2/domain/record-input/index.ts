import { z } from 'zod'
import billingAmount from '../amount-schema'
import values from '../record-values'
import temporal from '../temporal-schema'
import TEXT_MAX from '../text-limits'
import text from '../text-schema'

const DISCRIMINATOR = 'recordType'
const kind = values.recordType.enum

const paymentInput = z.strictObject({
  recordType: z.literal(kind.payment),
  scheduledOn: temporal.isoDate,
  scheduledTime: temporal.minuteTime.nullable(),
  title: text.required(TEXT_MAX.title),
  category: values.category,
  paymentStatus: values.paymentStatus,
  payeeLabel: text.required(TEXT_MAX.payeeLabel),
  amount: billingAmount,
  noteText: text.optional(TEXT_MAX.noteText),
  closingApprovalFollowUp: z.boolean(),
})

const eventInput = z.strictObject({
  recordType: z.literal(kind.event),
  scheduledOn: temporal.isoDate,
  scheduledTime: temporal.minuteTime.nullable(),
  title: text.required(TEXT_MAX.title),
  eventTypeLabel: text.optional(TEXT_MAX.eventTypeLabel),
  noteText: text.optional(TEXT_MAX.noteText),
})

const monthNoteInput = z.strictObject({
  recordType: z.literal(kind.month_note),
  noteMonth: temporal.isoDate,
  noteText: text.required(TEXT_MAX.noteText),
})

const billingRecordInput = z.discriminatedUnion(DISCRIMINATOR, [
  paymentInput,
  eventInput,
  monthNoteInput,
])

/** Validates any billing v2 mutation the browser sends, so an invalid record never reaches
 * the network and never has to be refused by a database CHECK instead. */
export default billingRecordInput

// One strict object per record type, joined on the immutable discriminator. Strict is what
// makes a subtype reject the other subtypes' fields: an event carrying an amount is an
// unrecognized key, not a null one, so it fails here rather than arriving as a row the shape
// constraint has to argue with. Every field delegates to the schema that owns its rule —
// amounts to the exact-cent one, blankness to the trim-compatible one, days and clock times
// to the calendar one — so this module decides which fields a record has and nothing about
// what a valid field looks like. The parsed output is assignable to BillingRecordInput, and
// the suite asserts that, which is what keeps the hand-written contract and this schema one.
