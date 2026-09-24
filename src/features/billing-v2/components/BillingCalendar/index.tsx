'use client'
import { useMemo, useState } from 'react'
import { parseISO, startOfMonth } from 'date-fns'
import { useT } from '@/shared/i18n'
import { localDate } from '@/shared/utils'
import { CalendarView } from '@/shared/components/views'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordButton from '@/features/billing-v2/components/RecordButton'
import joinLine from '@/features/billing-v2/components/join-line'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'
import calendarItems from './calendar-items'
import monthNote from './month-note'

type Props = RecordViewProps & {
  /** A day was pressed: start a new record on it. */
  onNewOn: (day: string) => void
}

export default function BillingCalendar({ records, today, onOpen, onNewOn }: Props) {
  const { t, intlLocale } = useT()
  const [month, setMonth] = useState(() => localDate(startOfMonth(parseISO(today))))
  const items = useMemo(() => calendarItems(records, t, intlLocale), [records, t, intlLocale])
  const note = monthNote(records, month)
  const openId = (id: string) => { const found = records.find((one) => one.id === id); if (found) onOpen(found) }
  return (
    <BillingBox part="panel">
      {note && <RecordButton said={joinLine([t('billing.type.monthNote'), note.note_text])} look="note" onPress={() => onOpen(note)} />}
      <CalendarView month={month} items={items} locale={intlLocale} renderItem={({ line }) => line}
        onMonthChange={setMonth} onDaySelect={onNewOn} onItemSelect={openId}
        emptyDayLabel={() => t('billing.calendar.emptyDay')} />
    </BillingBox>
  )
}

// The billing adapter over the shared calendar. The view gets full dates, ids and lines; the
// meaning stays here — which record sits on which day, what its chip says, and that pressing it
// opens the editor. The id the view answers with is looked up in the same records it was built
// from, so an item can only ever open the row it was drawn for.
//
// The month on screen is kept here and opens on the business day's month. The month note is
// billing's idea and is drawn above the grid, never pinned to the 1st. Pressing a day starts a
// new record on that date; pressing a record inside the day opens that record — they are sibling
// buttons in the shared view, so both answer the keyboard.
