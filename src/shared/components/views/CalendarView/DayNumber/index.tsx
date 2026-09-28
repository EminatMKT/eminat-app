'use client'
import Pressable from '@/shared/components/ui/Pressable'
import dateLabel from '../date-label'
import s from '../DayCell/index.module.css'

type Props = {
  /** The day, as an ISO date-only string. */
  date: string
  locale: string
  /** This is the feature's today: the cell is marked and says it is the current date. */
  today: boolean
  onDaySelect: (date: string) => void
}

export default function DayNumber({ date, locale, today, onDaySelect }: Props) {
  const { day, number } = dateLabel(date, locale)
  return (
    <Pressable accessibleLabel={day} className={today ? `${s.number} ${s.today}` : s.number}
      current={today ? 'date' : undefined} onClick={() => onDaySelect(date)}>{number}</Pressable>
  )
}

// The day's own button, stretched over its whole cell, drawing the number and announcing the
// whole date. Today gets a ring on the cell and `aria-current="date"`, so it is found by eye and by ear.
