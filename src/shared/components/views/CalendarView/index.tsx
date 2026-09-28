'use client'
import type { CalendarItem, CalendarViewProps } from '../types'
import periodModes from './period-modes'
import CalendarBox from './CalendarBox'
import DayCell from './DayCell'
import PeriodNav from './PeriodNav'

export default function CalendarView<T extends CalendarItem>(props: CalendarViewProps<T>) {
  const { period, mode, items, locale, today, onPeriodChange } = props
  const { onDaySelect, onItemSelect, moreLabel, lessLabel } = props
  return (
    <CalendarBox part="page">
      <PeriodNav period={period} mode={mode} locale={locale} onPeriodChange={onPeriodChange} />
      <CalendarBox part="grid">
        {periodModes[mode].days(period).map((day) => (
          <DayCell key={day} date={day} locale={locale} today={day === today} items={items.filter((one) => one.date === day)}
            onDaySelect={onDaySelect} onItemSelect={onItemSelect} moreLabel={moreLabel} lessLabel={lessLabel} />
        ))}
      </CalendarBox>
    </CalendarBox>
  )
}

// A page of anything, over a period of time. The view owns the page —which days it shows, where
// they sit, what is reachable by keyboard— and nothing else: it never groups, filters or
// authorizes, and it does not know what a record is. The feature hands it items with a date and
// a label, and gets back the day, the period or the id that was pressed.
//
// It is controlled on purpose. The period on screen is a prop, so the screen around it can put
// it in a URL, share it with a list beside the calendar or restore it after a reload — none of
// which is possible once it is a `useState` hidden in here.
//
// The mode decides the grid and the step of the arrows, through `period-modes`; only the month
// exists. A month page is whole weeks, so it shows a few days of the neighbouring months: a
// record on the 31st has to be visible from the page that borrows it, and hiding those cells is
// how a calendar loses records at its own edges.
