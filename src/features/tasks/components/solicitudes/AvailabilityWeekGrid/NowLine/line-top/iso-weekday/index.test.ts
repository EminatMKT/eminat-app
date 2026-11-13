import { describe, expect, it } from 'vitest'
import isoWeekday from '.'

// No trailing `Z`: each stamp parses as local time, so the weekday holds in any time zone.
const SUNDAY_NOON = '2026-11-08T12:00:00'
const MONDAY_NOON = '2026-11-09T12:00:00'
const SATURDAY_NOON = '2026-11-14T12:00:00'

describe('isoWeekday', () => {
  it('maps a JS Sunday (getDay 0) to the grid last column, 7', () => {
    expect(isoWeekday(new Date(SUNDAY_NOON))).toBe(7)
  })

  it('maps a JS Monday (getDay 1) to the grid first column, 1', () => {
    expect(isoWeekday(new Date(MONDAY_NOON))).toBe(1)
  })

  it('keeps Saturday as 6', () => {
    expect(isoWeekday(new Date(SATURDAY_NOON))).toBe(6)
  })
})
