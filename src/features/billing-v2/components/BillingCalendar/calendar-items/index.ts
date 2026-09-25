import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import type { CalendarItem } from '@/shared/components/views'
import { fechaCorta } from '@/shared/utils'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import recordLine from '@/features/billing-v2/components/record-line'
import joinLine from '@/features/billing-v2/components/join-line'

type Translate = (key: I18nKey) => string

const dayKey = ({ scheduled_on, scheduled_time }: BillingV2Record) => `${scheduled_on ?? ''} ${scheduled_time ?? ''}`

/** The records that live on a day, as calendar items keyed by record id, in time order. */
export default function calendarItems(records: readonly BillingV2Record[], t: Translate, intlLocale: string) {
  const dated = records.filter(({ scheduled_on }) => !!scheduled_on)
  return [...dated].sort((a, b) => dayKey(a).localeCompare(dayKey(b))).map((record) => {
    const date = record.scheduled_on ?? ''
    const line = recordLine(record, t, intlLocale)
    const kind = t(billingLabelKey(record.record_type))
    const item: CalendarItem & { line: string } = {
      id: record.id, date, line, accessibleLabel: joinLine([kind, fechaCorta(date, intlLocale), line]),
    }
    return item
  })
}

// The billing half of the calendar: which records sit on a day, and what each one says. The
// shared view only receives full dates and ids; which date a record lands on is decided here.
//
// Payments and events have a `scheduled_on`; a month note has none, so it never reaches the day
// grid — the billing screen draws it beside the month instead. A paid payment stays: paying
// something takes it off the reminders, not off the calendar.
//
// The button's label repeats the date because a screen reader lands on the record, not on the
// day around it. The id is the record's own, so the callback the view answers with is enough to
// find the row again and open it in the editor.
