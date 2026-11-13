import type { ReactNode } from 'react'

/** Which piece of the availability range item this frame is. */
export type AvailabilityRangeItemFramePart = 'item' | 'times' | 'removeWrap'

export type AvailabilityRangeItemFrameProps = {
  part: AvailabilityRangeItemFramePart
  children: ReactNode
}
