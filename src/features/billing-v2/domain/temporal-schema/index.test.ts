import { expect, it } from 'vitest'
import temporal from './index'

const REAL_DAYS = ['2026-09-23', '2024-02-29', '2026-02-28', '0001-01-01', '9999-12-31']
const IMPOSSIBLE_DAYS = [
  '2026-9-3', '2026-02-30', '2025-02-29', '2026-04-31', '2026-01-32',
  '0000-01-01', '2026-13-01', '2026-00-10', '2026-09-23T00:00:00Z', '', '20260923',
]
const BAD_TIMES = ['24:00', '23:60', '12:30:00', '1:00', '12:3', '2400', '', '09:30 ']

it('accepts real calendar days inside the 0001-9999 range', () => {
  for (const day of REAL_DAYS) expect(temporal.isoDate.parse(day)).toBe(day)
})

it('refuses malformed, impossible and out-of-range days', () => {
  for (const day of IMPOSSIBLE_DAYS) expect(temporal.isoDate.safeParse(day).success).toBe(false)
})

it('takes a month note month only as the first day of that month', () => {
  expect(temporal.monthStart.parse('2026-09-01')).toBe('2026-09-01')
  for (const day of ['2026-09-02', '2026-09-30', '2026-02-29']) {
    expect(temporal.monthStart.safeParse(day).success).toBe(false)
  }
})

it('takes wall-clock times at minute granularity and refuses 24:00', () => {
  for (const time of ['00:00', '09:30', '23:59']) {
    expect(temporal.minuteTime.parse(time)).toBe(time)
  }
  for (const time of BAD_TIMES) expect(temporal.minuteTime.safeParse(time).success).toBe(false)
})
