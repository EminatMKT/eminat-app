'use client'
import type { CalendarItem, CalendarViewProps } from '@/shared/components/views/types'
import Pressable from '@/shared/components/ui/Pressable'
import CalendarBox from '../CalendarBox'
import dateLabel from '../date-label'
import shiftMonth from '../shift-month'
import s from './index.module.css'

type Props = Pick<CalendarViewProps<CalendarItem>, 'month' | 'locale' | 'onMonthChange'>

export default function MonthNav({ month, locale, onMonthChange }: Props) {
  const back = shiftMonth(month, -1)
  const forward = shiftMonth(month, 1)
  return (
    <CalendarBox part="nav">
      <Pressable accessibleLabel={dateLabel(back, locale).month} className={s.step}
        onClick={() => onMonthChange(back)}>‹</Pressable>
      {dateLabel(month, locale).month}
      <Pressable accessibleLabel={dateLabel(forward, locale).month} className={s.step}
        onClick={() => onMonthChange(forward)}>›</Pressable>
    </CalendarBox>
  )
}

// The two arrows and the name of the month on screen. Each arrow is named after where it lands
// —"November 2026"— and not after the direction it points: "previous month" read out loud twice
// in a row does not say which month either press reaches.
//
// The month is plain text between the arrows and not a heading: this view is dropped inside
// screens that already own their headings, and a stray `<h2>` would claim a level of an outline
// it knows nothing about.
