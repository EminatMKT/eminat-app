import { describe, expect, it } from 'vitest'
import { PIXELS_PER_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import type { LineTopInput } from '../types'
import lineTop from '.'

// No trailing `Z`: each stamp parses as local time, so the weekday holds in any time zone.
const MONDAY_NINE_AM = '2026-11-09T09:00:00'
const SUNDAY_THREE_PM = '2026-11-08T15:00:00'

const MONDAY_AT_NINE: LineTopInput = {
  current: new Date(MONDAY_NINE_AM),
  weekday: 1,
  pxPerMin: PIXELS_PER_MINUTE,
}
const SUNDAY_AT_THREE: LineTopInput = {
  current: new Date(SUNDAY_THREE_PM),
  weekday: 7,
  pxPerMin: PIXELS_PER_MINUTE,
}
const TUESDAY_COLUMN: LineTopInput = { ...MONDAY_AT_NINE, weekday: 2 }
const UNREAD_CLOCK: LineTopInput = { ...MONDAY_AT_NINE, current: null }

describe('lineTop', () => {
  it('places the line at minutes since midnight times the grid density on today column', () => {
    // 9:00 = 540 min; 540 × 0.75 = 405px, exactly where the 09 hour row starts (9 × 45px).
    expect(lineTop(MONDAY_AT_NINE)).toBe(405)
  })

  it('draws on the Sunday column when today is a JS Sunday', () => {
    expect(lineTop(SUNDAY_AT_THREE)).toBe(675)
  })

  it('draws nothing on any other day column', () => {
    expect(lineTop(TUESDAY_COLUMN)).toBeNull()
  })

  it('draws nothing before the clock has been read', () => {
    expect(lineTop(UNREAD_CLOCK)).toBeNull()
  })
})
