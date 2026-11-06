'use client'
import GridDay from './GridDay'
import Popover from './Popover'
import TimeGutter from './TimeGutter'
import useGridController from './controller'
import type { AvailabilityWeekGridProps, GridDayProps } from './types'
import s from './index.module.css'

function renderDay({ day, ...props }: GridDayProps) {
  return <GridDay key={day.weekday} day={day} {...props} />
}

/** Composes the declared week, day gestures, and the currently selected range dialog. */
export default function AvailabilityWeekGrid(props: AvailabilityWeekGridProps) {
  const { days, popover, summary } = useGridController(props)

  return <>
    <p className={s.summary}>{summary.total}</p>
    {props.ranges.length === 0 && <p className={s.empty}>{summary.empty}</p>}
    <div className={s.root}><TimeGutter />{days.map(renderDay)}</div>
    {popover && <Popover key={popover.range.clientId} {...popover} />}
  </>
}

// The caller owns ranges; selection and gesture wiring stay inside the weekly grid.
