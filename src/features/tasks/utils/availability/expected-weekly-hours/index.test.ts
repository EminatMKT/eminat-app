import { describe, expect, it } from 'vitest'
import expectedWeeklyHours from '.'

describe('expectedWeeklyHours', () => {
  it('projects a daily jornada across every day of the week', () => {
    expect(expectedWeeklyHours(8)).toBe(56)
  })

  it('returns zero for a zero-hour jornada', () => {
    expect(expectedWeeklyHours(0)).toBe(0)
  })
})
