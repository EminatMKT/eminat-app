import { describe, expect, it } from 'vitest'
import type { OverlapCandidate } from './types'
import hasOverlap from '.'

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
    const nonOverlapping = [touching, otherWeekday, malformed]

    for (const other of nonOverlapping) {
      expect(hasOverlap(base, other)).toBe(false)
    }
  })
})
