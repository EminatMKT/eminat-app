import { describe, expect, it } from 'vitest'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import resizeTopEdge from '.'

const ANCHOR: MinuteBounds = { start: 600, end: 660 }

describe('resizeTopEdge', () => {
  it('snaps the dragged minute and pins the anchored end', () => {
    expect(resizeTopEdge({ start: 0, end: 1440 }, ANCHOR, 565)).toEqual({ start: 570, end: 660 })
  })

  it('clamps against the frozen neighbor limit', () => {
    expect(resizeTopEdge({ start: 540, end: 1440 }, ANCHOR, 500)).toEqual({ start: 540, end: 660 })
  })

  it('clamps against the block’s own minimum duration', () => {
    expect(resizeTopEdge({ start: 0, end: 1440 }, ANCHOR, 650)).toEqual({ start: 630, end: 660 })
  })
})
