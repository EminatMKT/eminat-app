import type { PointerEvent as ReactPointerEvent } from 'react'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

export type BlockResizeEdge = 'top' | 'bottom'

export type BlockResizeHandlePointerDown = (
  edge: BlockResizeEdge,
  event: ReactPointerEvent<HTMLDivElement>,
) => void

export type BlockProps = {
  range: WeeklyAvailabilityRange
  readOnly: boolean
  pxPerMin: number
  onActivate: () => void
  onResizeHandlePointerDown?: BlockResizeHandlePointerDown
}
