import type { BillingV2Record } from '@/shared/data'
import values from '../record-values'

/** Whether a record is a payment — the only record type events and month notes are not. */
export default function isPayment({ record_type }: BillingV2Record): boolean {
  return record_type === values.recordType.enum.payment
}

// Shared by `reminder-lists` and `month-overview`: both need to filter payments out of the full
// record set, and a record's own type is the only thing either of them checks to do it.
