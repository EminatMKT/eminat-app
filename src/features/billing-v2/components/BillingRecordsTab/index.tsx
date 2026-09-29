import BillingBox from '@/features/billing-v2/components/BillingBox'
import BillingCalendar from '@/features/billing-v2/components/BillingCalendar'
import ReminderPanel from '@/features/billing-v2/components/ReminderPanel'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'

type Props = RecordViewProps & {
  /** The calendar's month page on screen, and how to change it — owned by the parent screen so
   *  it survives switching to the Overview tab and back. */
  period: string
  onPeriodChange: (period: string) => void
  /** A day was pressed on the calendar: start a new record on it. */
  onNewOn: (day: string) => void
}

export default function BillingRecordsTab(props: Props) {
  const { records, today, onOpen, period, onPeriodChange, onNewOn } = props
  return (
    <BillingBox part="views">
      <BillingCalendar records={records} today={today} onOpen={onOpen} period={period} onPeriodChange={onPeriodChange} onNewOn={onNewOn} />
      <ReminderPanel records={records} today={today} onOpen={onOpen} />
    </BillingBox>
  )
}

// The editing tab of the billing screen: the calendar and the reminders side by side, the same
// pair `BillingV2Content` used to draw inline before the screen grew a second, read-only tab.
// `period` passes through to the calendar; the reminders never cared what month is on screen.
