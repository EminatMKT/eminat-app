import { describe, expect, it } from 'vitest'
import type { Weekday } from './types'
import hasOverlap from './has-overlap'

type OverlapCandidate = {
  weekday: Weekday
  start: number | null
  end: number | null
}

describe('hasOverlap', () => {
  it('reports an overlap between two ranges on the same weekday', () => {
    const a: OverlapCandidate = {
      weekday: 1,
      start: 540,
      end: 780,
    }
    const b: OverlapCandidate = {
      weekday: 1,
      start: 750,
      end: 840,
    }
    expect(hasOverlap(a, b)).toBe(true)
  })

  it('does not count touching ranges, a different weekday, or a malformed span as an overlap', () => {
    const base: OverlapCandidate = {
      weekday: 1,
      start: 540,
      end: 780,
    }
    const touching: OverlapCandidate = {
      weekday: 1,
      start: 780,
      end: 1020,
    }
    const otherWeekday: OverlapCandidate = {
      weekday: 2,
      start: 600,
      end: 700,
    }
    const malformed: OverlapCandidate = {
      weekday: 1,
      start: null,
      end: 700,
    }
    expect(hasOverlap(base, touching)).toBe(false)
    expect(hasOverlap(base, otherWeekday)).toBe(false)
    expect(hasOverlap(base, malformed)).toBe(false)
  })
})
