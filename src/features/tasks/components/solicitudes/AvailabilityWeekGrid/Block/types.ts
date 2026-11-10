import type { PointerEvent as ReactPointerEvent } from 'react'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

export type BlockResizeEdge = 'top' | 'bottom'

/** Which metric set a block is drawn with: compact for a range of one snap step or less. */
export type BlockSize = 'compact' | 'normal'

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
  onResizeHandleLifecycle?: ResizeHandleLifecycle
}

export type ResizeHandleLifecycle = {
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
  onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void
}
