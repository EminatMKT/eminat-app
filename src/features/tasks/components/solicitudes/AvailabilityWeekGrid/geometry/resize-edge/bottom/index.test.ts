import { describe, expect, it } from 'vitest'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import resizeBottomEdge from '.'

const ANCHOR: MinuteBounds = { start: 600, end: 660 }

describe('resizeBottomEdge', () => {
  it('snaps the dragged minute and pins the anchored start', () => {
    expect(resizeBottomEdge({ start: 0, end: 1440 }, ANCHOR, 700)).toEqual({ start: 600, end: 690 })
  })

  it('clamps against the frozen neighbor limit', () => {
    expect(resizeBottomEdge({ start: 0, end: 700 }, ANCHOR, 730)).toEqual({ start: 600, end: 700 })
  })

  it('clamps against the block’s own minimum duration', () => {
    expect(resizeBottomEdge({ start: 0, end: 1440 }, ANCHOR, 610)).toEqual({ start: 600, end: 630 })
  })
})
