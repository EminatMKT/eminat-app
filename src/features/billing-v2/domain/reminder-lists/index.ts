import type { BillingV2Record } from '@/shared/data'
import values from '../record-values'
import reminderGroup from '../reminder-group'

type ReminderLists = { overdue: BillingV2Record[]; upcoming: BillingV2Record[] }

const isPayment = ({ record_type }: BillingV2Record) => record_type === values.recordType.enum.payment
const dueKey = ({ scheduled_on, scheduled_time }: BillingV2Record) => `${scheduled_on ?? ''} ${scheduled_time ?? ''}`

/** The unpaid payments split into Overdue and Upcoming around `today`, each by due date. */
export default function reminderLists(records: readonly BillingV2Record[], today: string): ReminderLists {
  const lists: ReminderLists = { overdue: [], upcoming: [] }
  const payments = records.filter(isPayment).sort((a, b) => dueKey(a).localeCompare(dueKey(b)))
  for (const payment of payments) {
    const dueDate = payment.scheduled_on
    const isPaid = payment.payment_status === values.paymentStatus.enum.paid
    const group = dueDate ? reminderGroup({ dueDate, today, isPaid }) : null
    if (group) lists[group].push(payment)
  }
  return lists
}

// The two reminder lists of the billing screen, built from the whole record set and not from
// the month on screen: the contract gives Upcoming no horizon, so a payment months ahead still
// shows, and an overdue one never hides because the calendar moved on.
//
// Only payments reach `reminderGroup` — events and month notes are never reminders — and a paid
// one comes back null and is skipped here, while it stays on the calendar. `today` is the
// business day the caller resolved; this function never reads a clock.
