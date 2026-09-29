'use client'
import { useMemo } from 'react'
import { isSameMonth, parseISO } from 'date-fns'
import { useT } from '@/shared/i18n'
import { CalendarView } from '@/shared/components/views'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordButton from '@/features/billing-v2/components/RecordButton'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'
import calendarItems from './calendar-items'
import monthNotes from './month-note'

type Props = RecordViewProps & {
  /** The month page on screen, and how to change it — owned by the screen, not this adapter, so
   *  it survives switching away to another tab and back. */
  period: string
  onPeriodChange: (period: string) => void
  /** A day was pressed: start a new record on it. */
  onNewOn: (day: string) => void
}

export default function BillingCalendar(props: Props) {
  const { records, today, onOpen, period, onPeriodChange, onNewOn } = props
  const { t, intlLocale } = useT()
  const items = useMemo(() => calendarItems(records, t, intlLocale), [records, t, intlLocale])
  const notes = monthNotes(records, period)
  const empty = !notes.length && !items.some((one) => isSameMonth(parseISO(one.date), parseISO(period)))
  const openId = (id: string) => { const found = records.find((one) => one.id === id); if (found) onOpen(found) }
  const noteLine = (text: string | null) => t('billing.calendar.noteLine', { kind: t('billing.type.monthNote'), text: text ?? '' })
  return (
    <BillingBox part="panel">
      {notes.map((note) => (
        <RecordButton key={note.id} accessibleLabel={noteLine(note.note_text)} look="note" onPress={() => onOpen(note)}>
          {noteLine(note.note_text)}
        </RecordButton>
      ))}
      {empty && <BillingBox part="hint">{t('billing.calendar.empty')}</BillingBox>}
      <CalendarView period={period} mode="month" items={items} locale={intlLocale} today={today} todayLabel={t('billing.calendar.today')}
        onPeriodChange={onPeriodChange} onDaySelect={onNewOn} onItemSelect={openId}
        moreLabel={(count) => t('billing.calendar.more', { count })} lessLabel={t('billing.calendar.less')} />
    </BillingBox>
  )
}

// The billing adapter over the shared calendar. `period` moved up to `BillingV2Content` so the
// month a person navigated to survives switching to Overview and back. Month notes are drawn
// above the grid; a day press starts a record, a record press opens it.
