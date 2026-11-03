import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BlockResizeEdge, BlockResizeHandlePointerDown } from '../types'
import s from './index.module.css'

const TOP_EDGE: BlockResizeEdge = 'top'

type Props = {
  edge: BlockResizeEdge
  onPointerDown?: BlockResizeHandlePointerDown
}

/** Markup only — Task 6 wires the actual pointer-drag resize gesture onto this handle. */
export default function ResizeHandle({ edge, onPointerDown }: Props) {
  const edgeClassName = edge === TOP_EDGE ? s.top : s.bottom
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(edge, event)
  }

  return (
    <div
      aria-hidden="true"
      className={`${s.handle} ${edgeClassName}`}
      onPointerDown={handlePointerDown}
    />
  )
}

// ResizeHandle draws one edge-drag affordance; Block mounts one per edge when it is editable.
