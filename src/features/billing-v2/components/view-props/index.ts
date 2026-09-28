import type { BillingV2Record } from '@/shared/data'

/** What every view of the billing screen receives: the records, the business day, and the way
 *  back to the editor. */
export type RecordViewProps = {
  records: readonly BillingV2Record[]
  /** The business day, as an ISO date-only string. */
  today: string
  onOpen: (record: BillingV2Record) => void
}

// The calendar and the reminder panel read the same three things from the screen: the one copy
// of the records the hook keeps, the day the screen resolved in the business timezone, and the
// callback that opens a record in the editor. Declared once so the two views cannot drift apart
// in what they are given; a view that needs more extends it.
