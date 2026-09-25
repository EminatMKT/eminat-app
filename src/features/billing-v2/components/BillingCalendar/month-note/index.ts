import type { BillingV2Record } from '@/shared/data'
import values from '@/features/billing-v2/domain/record-values'

/** The note stored for `month` (its ISO first day), or null when the month has none. */
export default function monthNote(records: readonly BillingV2Record[], month: string): BillingV2Record | null {
  const note = records.find(({ record_type, note_month }) =>
    record_type === values.recordType.enum.month_note && note_month === month)
  return note ?? null
}

// How billing reads a month note: the one row of type `month_note` whose `note_month` is the
// month on screen. The contract stores it as the month's first day and allows one per month,
// which is what lets the calendar's own `month` prop find it by plain equality.
//
// This stays in billing on purpose. The shared calendar only knows full dates; a month-level
// record is a billing idea, and it is drawn above the grid rather than forced onto the 1st.
