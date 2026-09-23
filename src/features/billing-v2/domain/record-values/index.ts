import { z } from 'zod'

const recordType = z.enum([
  'payment',
  'event',
  'month_note',
])

const category = z.enum([
  'payroll',
  'contractors_vendors',
])

const paymentStatus = z.enum([
  'pending',
  'scheduled',
  'pending_approval',
  'paid',
])

const billingRecordValues = { recordType, category, paymentStatus }

/** The three closed vocabularies of a billing v2 record, each one declared once.
 * No label lives here: the UI translates every member through i18n. */
export default billingRecordValues

// Holds which kind of row a record is, which budget bucket a payment belongs to and how far
// along its settlement is. They are zod enums rather than plain arrays so that the option
// list, its TypeScript union and the validator are the same declaration and cannot drift.
// The database repeats these members in CHECK constraints: a member added here is a member
// that has to be added there in the same change, or a valid record stops being storable.
