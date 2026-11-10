import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  DAY_START_TIME,
  LAST_SNAP_START_TIME,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { NINE_AM, TEN_AM } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import nextFreeSlot from '.'

const MONDAY = 1
const ONE_AM = '01:00'
const LAST_MINUTE = '23:59'
const TOO_SHORT_START = '23:45'
const MIDNIGHT_SLOT_CASE = 'offers the last half-hour through midnight'
const SHORT_WINDOW_CASE = 'does not offer less than a full snap step'

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY,
  startsAt,
  endsAt,
})

describe('nextFreeSlot', () => {
  it('offers the first hour of an empty day', () => {
    expect(nextFreeSlot([])).toEqual({ startsAt: DAY_START_TIME, endsAt: ONE_AM })
  })

  it('anchors right after an existing range instead of at midnight', () => {
    const booked = range(DAY_START_TIME, NINE_AM)

    expect(nextFreeSlot([booked])).toEqual({ startsAt: NINE_AM, endsAt: TEN_AM })
  })

  it(MIDNIGHT_SLOT_CASE, () => {
    const booked = range(DAY_START_TIME, LAST_SNAP_START_TIME)
    const expected = { startsAt: LAST_SNAP_START_TIME, endsAt: END_OF_DAY_TIME }

    expect(nextFreeSlot([booked])).toEqual(expected)
  })

  it(SHORT_WINDOW_CASE, () => {
    const booked = range(DAY_START_TIME, TOO_SHORT_START)

    expect(nextFreeSlot([booked])).toBeNull()
  })

  it('returns null when the day is fully booked', () => {
    const booked = range(DAY_START_TIME, LAST_MINUTE)

    expect(nextFreeSlot([booked])).toBeNull()
  })
})
