import { hhmmOf } from '@/features/tasks/utils/availability'
import { MINUTES_PER_HOUR } from '@/features/tasks/utils/availability/constants'
import { DAY_END_MINUTE, DAY_START_MINUTE } from '../geometry/constants'
import s from '../index.module.css'

function hourMinutes(): number[] {
  const hourCount = (DAY_END_MINUTE - DAY_START_MINUTE) / MINUTES_PER_HOUR
  const arrayLength = { length: hourCount }

  return Array.from(arrayLength, (_, hour) => hour * MINUTES_PER_HOUR)
}

function hourLine(minute: number) {
  return <span key={minute} className={s.hour}>{hhmmOf(minute)}</span>
}

/** The grid's one shared time-of-day column: a fixed-height hour row per hour, stacked to
 *  match the 45px-per-hour track every day column already draws against. */
export default function TimeGutter() {
  return <div className={s.gutter} data-grid-gutter>{hourMinutes().map(hourLine)}</div>
}

// Stacked fixed-height rows need no pixel math of their own: the CSS already matches the track.
