import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import type { CalendarItem } from '@/shared/components/views'
import values from '@/features/billing-v2/domain/record-values'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import recordFields from '@/features/billing-v2/components/record-fields'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

const dayKey = ({ scheduled_on, scheduled_time }: BillingV2Record) => `${scheduled_on ?? ''} ${scheduled_time ?? ''}`

/** The records that live on a day, as calendar items keyed by record id, in time order. */
export default function calendarItems(records: readonly BillingV2Record[], t: Translate, intlLocale: string) {
  const dated = records.filter(({ scheduled_on }) => !!scheduled_on)
  return [...dated].sort((a, b) => dayKey(a).localeCompare(dayKey(b))).map((record): CalendarItem => {
    const fields = recordFields(record, t, intlLocale)
    const text = fields.time ? `${fields.time} ${fields.concept}` : fields.concept
    const kind = t(billingLabelKey(record.record_type))
    const accessibleLabel = record.record_type === values.recordType.enum.payment
      ? t('billing.calendar.paymentAria', { ...fields, text, kind })
      : t('billing.calendar.eventAria', { date: fields.date, text, kind })
    return { id: record.id, date: record.scheduled_on ?? '', label: text, accessibleLabel }
  })
}

// The billing half of the calendar: which records sit on a day, and what each one says. The
// shared view only receives full dates and ids; which date a record lands on is decided here.
//
// The chip draws only the time and the concept —a thin one-line bar has room for nothing more,
// and the view cuts even that with an ellipsis—. The whole record, amount and status included,
// goes into the accessible label, which the view also shows on hover; the editor that opens on
// a press has the rest. The label repeats the date because a screen reader lands on the record,
// not on the day around it.
//
// Payments and events have a `scheduled_on`; a month note has none, so it never reaches the day
// grid — the billing screen draws it above the month instead. A paid payment stays: paying
// something takes it off the reminders, not off the calendar.
