import { SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import snapMinutes from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/snap'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'

/** The dragged top edge's snapped, clamped position: bounded below by the frozen neighbor
 *  `limit` and above by `anchor`'s own end minus one snap step, so the block never collapses
 *  below its minimum duration. `anchor`'s end is the block's non-moving edge. */
export default function resizeTopEdge(
  limit: MinuteBounds,
  anchor: MinuteBounds,
  rawMinute: number,
): MinuteBounds {
  const maxStart = anchor.end - SNAP_MINUTES
  const start = Math.min(Math.max(snapMinutes(rawMinute), limit.start), maxStart)

  return { start, end: anchor.end }
}

// This module resolves a dragged top-edge resize to its snapped, clamped start minute.
