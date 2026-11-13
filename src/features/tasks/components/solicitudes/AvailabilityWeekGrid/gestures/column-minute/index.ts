import pixelToMinute from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/pixel-to-minute'
import type { PixelToMinuteInput } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/pixel-to-minute/types'
import type { GestureColumnGeometry } from '../types'

/** `pixelToMinute`, taking the column's geometry as one value instead of two loose numbers —
 *  every gesture handler reads a pointer's minute through this one call. */
export default function columnMinuteAt(column: GestureColumnGeometry, clientY: number): number {
  const { columnTop, pxPerMin } = column
  const input: PixelToMinuteInput = { clientY, columnTop, pxPerMin }

  return pixelToMinute(input)
}

// Shared by create-gesture and resize-gesture so both read a pointer's minute the same way.
