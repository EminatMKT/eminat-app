import type { CSSProperties } from 'react'
import minutesToPixels from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/minutes-to-pixels'
import type { CreatePreviewProps } from './types'
import s from './index.module.css'

function previewStyle({ bounds, pxPerMin }: CreatePreviewProps): CSSProperties {
  const topPx = minutesToPixels(bounds.start, pxPerMin)
  const heightPx = minutesToPixels(bounds.end - bounds.start, pxPerMin)

  return { '--preview-top': `${topPx}px`, '--preview-height': `${heightPx}px` }
}

/** The live ghost rectangle a create gesture draws while dragging: a lightweight, non-
 *  interactive echo of Block's own position/size geometry — no resize handles, no click
 *  target, just where the range would land if the pointer were released now. */
export default function CreatePreview(props: CreatePreviewProps) {
  return <div className={s.preview} style={previewStyle(props)} data-create-preview />
}

// CreatePreview only ever draws the pixel rectangle a create gesture is currently tracking —
// it commits nothing, and GridDay stops rendering it the instant the gesture ends.
