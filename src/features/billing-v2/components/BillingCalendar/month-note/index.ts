import type { BillingV2Record } from '@/shared/data'
import values from '@/features/billing-v2/domain/record-values'

const MONTH_PREFIX = 'yyyy-mm'.length

/** Every note dated inside `month` (its ISO first day), earliest first. */
export default function monthNotes(records: readonly BillingV2Record[], month: string): BillingV2Record[] {
  const prefix = month.slice(0, MONTH_PREFIX)
  const inMonth = records.filter(({ record_type, note_month }) =>
    record_type === values.recordType.enum.month_note && note_month?.startsWith(prefix))
  return inMonth.sort((a, b) => (a.note_month ?? '').localeCompare(b.note_month ?? ''))
}

// How billing reads the month's notes: every row of type `month_note` whose date falls inside the
// month on screen. A note may be dated any day and a month may hold any number of them — the
// calendar groups them by month, above the grid, instead of pinning each one to its day.
// ISO dates compare as text, so the month is its `yyyy-mm` prefix and the order is plain string order.
//
// This stays in billing on purpose. The shared calendar only knows full dates; a month-level
// record is a billing idea.
