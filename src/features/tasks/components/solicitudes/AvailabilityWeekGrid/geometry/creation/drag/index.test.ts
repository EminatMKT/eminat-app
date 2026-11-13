import { describe, expect, it } from 'vitest'
import dragCreateRange from '.'

describe('dragCreateRange', () => {
  const bounds = { start: 0, end: 1440 }

  it('snaps both ends to the half hour, origin before current', () => {
    expect(dragCreateRange(bounds, 601, 719)).toEqual({ start: 600, end: 720 })
  })

  it('is direction-agnostic: current point before origin', () => {
    expect(dragCreateRange(bounds, 719, 601)).toEqual({ start: 600, end: 720 })
  })

  it('clamps to the day bounds', () => {
    const narrowBounds = { start: 600, end: 720 }

    expect(dragCreateRange(narrowBounds, 0, 1440)).toEqual({ start: 600, end: 720 })
  })

  it('never collapses to a zero-length range at the snap grid', () => {
    expect(dragCreateRange(bounds, 600, 605)).toEqual({ start: 600, end: 630 })
  })
})
