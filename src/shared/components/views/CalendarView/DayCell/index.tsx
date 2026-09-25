'use client'
import { useState } from 'react'
import type { CalendarItem, CalendarViewProps } from '@/shared/components/views/types'
import Pressable from '@/shared/components/ui/Pressable'
import CalendarBox from '../CalendarBox'
import dateLabel from '../date-label'
import dayOverflow from '../day-overflow'
import s from './index.module.css'

const ROWS = 3

interface Props<T extends CalendarItem> extends Pick<CalendarViewProps<T>,
  'locale' | 'items' | 'onDaySelect' | 'onItemSelect' | 'moreLabel' | 'lessLabel'> {
  /** The square this cell is, as an ISO date-only string. */
  date: string
}

export default function DayCell<T extends CalendarItem>(props: Props<T>) {
  const { date, locale, items, onDaySelect, onItemSelect, moreLabel, lessLabel } = props
  const [open, setOpen] = useState(false)
  const { shown, hidden, folds } = dayOverflow(items, ROWS, open)
  const toggle = open ? lessLabel : moreLabel(hidden)
  return (
    <CalendarBox part="day">
      <CalendarBox part={open ? 'open' : 'entries'}>
        <Pressable accessibleLabel={dateLabel(date, locale).day} className={s.number}
          onClick={() => onDaySelect(date)}>{dateLabel(date, locale).number}</Pressable>
        {shown.map((item) => (
          <Pressable key={item.id} accessibleLabel={item.accessibleLabel} hint={item.accessibleLabel}
            className={s.entry} onClick={() => onItemSelect(item.id)}>{item.label}</Pressable>
        ))}
        {folds && <Pressable accessibleLabel={toggle} className={s.more} onClick={() => setOpen(!open)}>{toggle}</Pressable>}
      </CalendarBox>
    </CalendarBox>
  )
}

// One square of the calendar: the day and whatever landed on it. The day's button covers the
// whole cell —the stylesheet stretches it under the entries—, so any empty spot of the square
// starts a new record there. The entries sit BESIDE that button and not inside it: a button
// nested in a button leaves one of the two unreachable by keyboard, and the browser picks which.
//
// The cell never grows. It has room for `ROWS` one-line entries; a fuller day shows one fewer and
// a «+N» that opens the day in place, where the list scrolls inside the same square. The control
// stays put when pressed and turns into the way back, so the keyboard focus never falls off it.
//
// An entry is a thin chip that cuts its label with an ellipsis and gives the whole text to hover
// and to the screen reader. The cell draws the number and announces the whole date, because the
// column a cell sits in is the other half of its name on screen and a screen reader never sees a
// column. An empty day draws only its number: a line in every empty cell was noise.
