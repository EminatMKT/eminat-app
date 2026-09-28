import BillingBox from '@/features/billing-v2/components/BillingBox'
import BillingCalendar from '@/features/billing-v2/components/BillingCalendar'
import ReminderPanel from '@/features/billing-v2/components/ReminderPanel'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'

type Props = RecordViewProps & {
  /** A day was pressed on the calendar: start a new record on it. */
  onNewOn: (day: string) => void
}

export default function BillingRecordsTab({ records, today, onOpen, onNewOn }: Props) {
  return (
    <BillingBox part="views">
      <BillingCalendar records={records} today={today} onOpen={onOpen} onNewOn={onNewOn} />
      <ReminderPanel records={records} today={today} onOpen={onOpen} />
    </BillingBox>
  )
}

// The editing tab of the billing screen: the calendar and the reminders side by side, the same
// pair `BillingV2Content` used to draw inline before the screen grew a second, read-only tab.
// Moved verbatim — no behavior changed here, only where the markup lives.
