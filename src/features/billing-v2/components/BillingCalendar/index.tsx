'use client'
import { useMemo, useState } from 'react'
import { isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { useT } from '@/shared/i18n'
import { localDate } from '@/shared/utils'
import { CalendarView } from '@/shared/components/views'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordButton from '@/features/billing-v2/components/RecordButton'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'
import calendarItems from './calendar-items'
import monthNote from './month-note'

type Props = RecordViewProps & {
  /** A day was pressed: start a new record on it. */
  onNewOn: (day: string) => void
}

export default function BillingCalendar({ records, today, onOpen, onNewOn }: Props) {
  const { t, intlLocale } = useT()
  const [period, setPeriod] = useState(() => localDate(startOfMonth(parseISO(today))))
  const items = useMemo(() => calendarItems(records, t, intlLocale), [records, t, intlLocale])
  const note = monthNote(records, period)
  const empty = !note && !items.some((one) => isSameMonth(parseISO(one.date), parseISO(period)))
  const openId = (id: string) => { const found = records.find((one) => one.id === id); if (found) onOpen(found) }
  const noteLine = t('billing.calendar.noteLine', { kind: t('billing.type.monthNote'), text: note?.note_text ?? '' })
  return (
    <BillingBox part="panel">
      {note && <RecordButton accessibleLabel={noteLine} look="note" onPress={() => onOpen(note)}>{noteLine}</RecordButton>}
      {empty && <BillingBox part="hint">{t('billing.calendar.empty')}</BillingBox>}
      <CalendarView period={period} mode="month" items={items} locale={intlLocale} today={today}
        onPeriodChange={setPeriod} onDaySelect={onNewOn} onItemSelect={openId}
        moreLabel={(count) => t('billing.calendar.more', { count })} lessLabel={t('billing.calendar.less')} />
    </BillingBox>
  )
}

// The billing adapter over the shared calendar. The view gets full dates, ids and labels; the
// meaning stays here — which record sits on which day, what its chip says, and that pressing it
// opens the editor. The id the view answers with is looked up in the same records it was built
// from, so an item can only ever open the row it was drawn for.
//
// The page is a month and opens on the business day's month. The month note is billing's idea
// and is drawn above the grid, never pinned to the 1st: `period` is the month's first day, which
// is exactly how a note's month is stored. Pressing a day starts a new record on that date;
// pressing a record inside the day opens that record — they are sibling buttons in the shared
// view, so both answer the keyboard. A month with nothing on it says, above the grid, how to add
// something; the business day is handed to the view to mark as today.
