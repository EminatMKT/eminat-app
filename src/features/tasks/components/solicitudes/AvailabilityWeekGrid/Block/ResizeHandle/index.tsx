import type { PointerEvent as ReactPointerEvent } from 'react'
import type {
  BlockResizeEdge,
  BlockResizeHandlePointerDown,
  ResizeHandleLifecycle,
} from '../types'
import { TOP_EDGE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry'
import s from './index.module.css'

type Props = {
  edge: BlockResizeEdge
  onPointerDown?: BlockResizeHandlePointerDown
  lifecycle?: ResizeHandleLifecycle
}

function lifecycleAttrs(lifecycle?: ResizeHandleLifecycle) {
  const attrs = {
    onPointerUp: lifecycle?.onPointerUp,
    onPointerCancel: lifecycle?.onPointerCancel,
    onLostPointerCapture: lifecycle?.onLostPointerCapture,
  }

  return attrs
}

/** Markup only — Task 6 wires the actual pointer-drag resize gesture onto this handle. */
export default function ResizeHandle({ edge, onPointerDown, lifecycle }: Props) {
  const edgeClassName = edge === TOP_EDGE ? s.top : s.bottom
  const className = `${s.handle} ${edgeClassName}`
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(edge, event)
  }
  const attrs = { className, onPointerDown: handlePointerDown, ...lifecycleAttrs(lifecycle) }

  return <div aria-hidden="true" data-resize-handle="true" {...attrs} />
}

// ResizeHandle draws one edge-drag affordance; Block mounts one per edge when it is editable.
