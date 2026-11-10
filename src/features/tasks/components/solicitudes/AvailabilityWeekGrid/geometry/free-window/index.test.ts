import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  EIGHT_AM,
  ELEVEN_AM,
  NINE_AM,
  NOON,
  ONE_PM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import { LAST_SNAP_START_TIME } from '../constants'
import freeWindow from '.'

const MONDAY = 1
const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => (
  { weekday: MONDAY, startsAt, endsAt }
)
const TEN_TEN = '10:10'
const TEN_TWENTY = '10:20'
const EIGHT_TO_NINE = range(EIGHT_AM, NINE_AM)
const ELEVEN_TO_NOON = range(ELEVEN_AM, NOON)
const NINE_TO_ONE = range(NINE_AM, ONE_PM)
const EIGHT_TO_TEN_TEN = range(EIGHT_AM, TEN_TEN)
const TEN_TWENTY_TO_NOON = range(TEN_TWENTY, NOON)
const LAST_HALF_HOUR = range(LAST_SNAP_START_TIME, END_OF_DAY_TIME)

describe('freeWindow', () => {
  it('spans the whole day when there are no neighboring ranges', () => {
    expect(freeWindow([], 600)).toEqual({ start: 0, end: 1440 })
  })

  it('is bounded below by a range that ends before the point', () => {
    const dayRanges = [EIGHT_TO_NINE]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 540, end: 1440 })
  })

  it('is bounded above by a range that starts after the point', () => {
    const dayRanges = [ELEVEN_TO_NOON]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 0, end: 660 })
  })

  it('is bounded on both sides between two neighboring ranges', () => {
    const dayRanges = [EIGHT_TO_NINE, ELEVEN_TO_NOON]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 540, end: 660 })
  })

  it('returns null for a point inside an existing range', () => {
    const dayRanges = [NINE_TO_ONE]

    expect(freeWindow(dayRanges, 600)).toBeNull()
  })

  it('treats the last half hour as occupied through midnight', () => {
    const dayRanges = [LAST_HALF_HOUR]

    expect(freeWindow(dayRanges, 1425)).toBeNull()
    expect(freeWindow(dayRanges, 1380)).toEqual({ start: 0, end: 1410 })
  })

  it('returns null when the remaining gap is under 30 minutes', () => {
    const dayRanges = [EIGHT_TO_TEN_TEN, TEN_TWENTY_TO_NOON]

    expect(freeWindow(dayRanges, 615)).toBeNull()
  })
})
