import type { z } from 'zod'
import values from '@/features/billing-v2/domain/record-values'

type RecordType = z.infer<typeof values.recordType>
type Category = z.infer<typeof values.category>
type PaymentStatus = z.infer<typeof values.paymentStatus>

/** One stored billing v2 row. `amount` arrives as text because PostgREST serialises `numeric`
 *  as a JSON number and no float holds every cent; null is unknown, `'0'` an explicit zero. */
export type BillingV2Record = {
  id: string
  record_type: RecordType
  scheduled_on: string | null
  scheduled_time: string | null
  note_month: string | null
  title: string | null
  category: Category | null
  payment_status: PaymentStatus | null
  payee_label: string | null
  amount: string | null
  currency_code: string | null
  event_type_label: string | null
  note_text: string | null
  closing_approval_follow_up: boolean
  created_by_id: string | null
  created_at: string
  updated_at: string
}

/** The columns this layer may write. The four it omits belong to the database: the identity,
 *  the creator the trigger resolves from the session, and both timestamps. */
export type BillingV2Write = Omit<
  BillingV2Record,
  'id' | 'created_by_id' | 'created_at' | 'updated_at'
>

/** Every writable column except the immutable discriminator, so each subtype can start from
 *  all-absent and fill only what it owns instead of listing the nulls it does not. */
export type BillingV2Absent = Omit<BillingV2Write, 'record_type'>
