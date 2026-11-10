import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  EIGHT_AM,
  NINE_AM,
  NOON,
  ONE_PM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import { LAST_SNAP_START_TIME } from '../constants'
import resizeBounds from '.'

const MONDAY = 1
const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => (
  { weekday: MONDAY, startsAt, endsAt }
)
const CURRENT = { start: 600, end: 660 }
const EIGHT_TO_NINE = range(EIGHT_AM, NINE_AM)
const NOON_TO_ONE = range(NOON, ONE_PM)
const LAST_HALF_HOUR = range(LAST_SNAP_START_TIME, END_OF_DAY_TIME)

describe('resizeBounds', () => {
  it('spans the whole day when there are no other ranges', () => {
    expect(resizeBounds([], CURRENT)).toEqual({ start: 0, end: 1440 })
  })

  it('is clamped by a range entirely before the current one', () => {
    const otherRanges = [EIGHT_TO_NINE]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 540, end: 1440 })
  })

  it('is clamped by a range entirely after the current one', () => {
    const otherRanges = [NOON_TO_ONE]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 0, end: 720 })
  })

  it('stops before a midnight-ending neighbor', () => {
    const otherRanges = [LAST_HALF_HOUR]
    const current = { start: 1320, end: 1380 }

    expect(resizeBounds(otherRanges, current)).toEqual({ start: 0, end: 1410 })
    expect(resizeBounds([], current)).toEqual({ start: 0, end: 1440 })
  })

  it('is clamped on both sides between two neighboring ranges', () => {
    const otherRanges = [EIGHT_TO_NINE, NOON_TO_ONE]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 540, end: 720 })
  })
})
