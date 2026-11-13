import { SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import snapMinutes from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/snap'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'

/** The dragged bottom edge's snapped, clamped position: bounded above by the frozen neighbor
 *  `limit` and below by `anchor`'s own start plus one snap step, so the block never collapses
 *  below its minimum duration. `anchor`'s start is the block's non-moving edge. */
export default function resizeBottomEdge(
  limit: MinuteBounds,
  anchor: MinuteBounds,
  rawMinute: number,
): MinuteBounds {
  const minEnd = anchor.start + SNAP_MINUTES
  const end = Math.max(Math.min(snapMinutes(rawMinute), limit.end), minEnd)

  return { start: anchor.start, end }
}

// This module resolves a dragged bottom-edge resize to its snapped, clamped end minute.
