'use client'
import type { CalendarItem, CalendarViewProps } from '@/shared/components/views/types'
import Pressable from '@/shared/components/ui/Pressable'
import CalendarBox from '../CalendarBox'
import periodModes from '../period-modes'
import s from './index.module.css'

type Props = Pick<CalendarViewProps<CalendarItem>, 'period' | 'mode' | 'locale' | 'onPeriodChange' | 'today' | 'todayLabel'>

export default function PeriodNav(props: Props) {
  const { period, mode, locale, onPeriodChange, today, todayLabel } = props
  const { step, name, periodOf } = periodModes[mode]
  const back = step(period, -1)
  const forward = step(period, 1)
  const todayPeriod = today ? periodOf(today) : null
  const showToday = todayPeriod !== null && todayLabel && todayPeriod !== period
  return (
    <CalendarBox part="nav">
      {showToday && (
        <Pressable accessibleLabel={todayLabel} className={s.today} onClick={() => onPeriodChange(todayPeriod)}>{todayLabel}</Pressable>
      )}
      <Pressable accessibleLabel={name(back, locale)} className={s.step}
        onClick={() => onPeriodChange(back)}>‹</Pressable>
      <CalendarBox part="title">{name(period, locale)}</CalendarBox>
      <Pressable accessibleLabel={name(forward, locale)} className={s.step}
        onClick={() => onPeriodChange(forward)}>›</Pressable>
    </CalendarBox>
  )
}

// The two arrows and the name of the period on screen. How far an arrow goes and what the period
// is called both come from its mode, so this header works unchanged for a week or a day. Each
// arrow is named after where it lands —"November 2026"— and not after the direction it points:
// "previous month" read out loud twice in a row does not say which month either press reaches.
//
// The name is plain text between the arrows and not a heading: this view is dropped inside
// screens that already own their headings, and a stray `<h2>` would claim a level of an outline
// it knows nothing about.
//
// The jump-to-today control is opt-in on two props at once (`today` + `todayLabel`) so a caller
// that only marks today's cell, without wanting the control, keeps working unchanged — and it
// hides itself once `period` already is today's, the same restraint Google Calendar's own
// "Today" button shows.
