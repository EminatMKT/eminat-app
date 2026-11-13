'use client'
import { useRef, useState } from 'react'
import Block from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block'
import { PIXELS_PER_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import type { SegmentCanvasProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import createResizePointer from './resize-pointer'

function useResize(props: SegmentCanvasProps) {
  const current = useRef(props)
  const [handlers] = useState(() => createResizePointer(() => current.current))

  current.current = props

  return handlers
}

function useBlockProps(props: SegmentCanvasProps) {
  const { range, readOnly, onOpen } = props
  const resize = useResize(props)
  const onActivate = () => onOpen(range)
  const events = { onActivate, onResizeHandlePointerDown: resize.onPointerDown }
  const data = { range, readOnly, pxPerMin: PIXELS_PER_MINUTE }
  const result = { ...data, ...events, onResizeHandleLifecycle: resize }

  return result
}

/** Places one activatable range with stable resize capture and live range data. */
export default function SegmentCanvas(props: SegmentCanvasProps) {
  const block = useBlockProps(props)

  return <Block {...block} />
}

// The block stays viewable when read-only; only the mutation affordances disappear.
