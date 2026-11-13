import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import { LAST_SNAP_START_TIME } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import {
  FIVE_PM,
  NINE_AM,
  NINE_THIRTY_AM,
  ONE_PM,
  TEN_AM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import blockGeometry from '.'

const PX_PER_MIN = 2
const TOP_KEY = '--block-top'
const HEIGHT_KEY = '--block-height'
const NOTE_LINES_KEY = '--note-lines'
const MORNING_TOP = '1080px'
const MORNING_HEIGHT = '480px'
const MIDNIGHT_TOP = '2820px'
const MIDNIGHT_HEIGHT = '60px'

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: 1,
  startsAt,
  endsAt,
})

const geometryOf = (startsAt: string, endsAt: string) =>
  blockGeometry(range(startsAt, endsAt), PX_PER_MIN)

describe('blockGeometry', () => {
  it('positions the block from the range start in minutes', () => {
    expect(geometryOf(NINE_AM, ONE_PM).style[TOP_KEY]).toBe(MORNING_TOP)
  })

  it('sizes the block from the range duration in minutes', () => {
    expect(geometryOf(NINE_AM, ONE_PM).style[HEIGHT_KEY]).toBe(MORNING_HEIGHT)
  })

  it('marks a range of 30 minutes or less as compact', () => {
    expect(geometryOf(NINE_AM, NINE_THIRTY_AM).compact).toBe(true)
  })

  it('renders the final half hour through midnight as compact', () => {
    const geometry = geometryOf(LAST_SNAP_START_TIME, END_OF_DAY_TIME)

    expect(geometry.style[TOP_KEY]).toBe(MIDNIGHT_TOP)
    expect(geometry.style[HEIGHT_KEY]).toBe(MIDNIGHT_HEIGHT)
    expect(geometry.compact).toBe(true)
  })

  it('marks a range longer than 30 minutes as not compact', () => {
    expect(geometryOf(NINE_AM, TEN_AM).compact).toBe(false)
  })

  it('sets more note lines on a tall block than on a compact one', () => {
    const compactLines = Number(geometryOf(NINE_AM, NINE_THIRTY_AM).style[NOTE_LINES_KEY])
    const tallLines = Number(geometryOf(NINE_AM, FIVE_PM).style[NOTE_LINES_KEY])

    expect(tallLines).toBeGreaterThan(compactLines)
  })
})
