'use client'
import { useRef, useState } from 'react'
import wireCreateGesture from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/create-gesture'
import createConfig from '../create-config'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'

function buildGesture(
  read: { current: GridDayProps },
  columnTop: () => number,
  onPreviewChange: (bounds: MinuteBounds | null) => void,
) {
  const config = createConfig(() => read.current, columnTop, onPreviewChange)

  return wireCreateGesture(config)
}

// A lazy ref, not a second useState: the gesture handler set is computed once and never
// changes, so pairing it with the live `preview` state would desync a stable value against one.
function useGesture(props: GridDayProps, columnTop: () => number) {
  const read = useRef(props)
  const [preview, setPreview] = useState<MinuteBounds | null>(null)
  const ref = useRef<ReturnType<typeof buildGesture>>()

  read.current = props
  ref.current ??= buildGesture(read, columnTop, setPreview)

  return { gesture: ref.current, preview }
}

/** One day's pointer-create wiring: a stable gesture handler set over the track's own ref,
 *  reading live props through `read` so neither the gesture nor its config goes stale, plus the
 *  gesture's own live drag-create preview bounds (`null` once there is none in progress). */
export default function useTrack(props: GridDayProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const columnTop = () => trackRef.current?.getBoundingClientRect().top ?? 0
  const gestureState = useGesture(props, columnTop)

  return { trackRef, columnTop, ...gestureState }
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
