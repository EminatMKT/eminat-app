'use client'
import { useRef, useState } from 'react'
import wireCreateGesture from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/create-gesture'
import createConfig from '../create-config'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'

function buildGesture(read: { current: GridDayProps }, columnTop: () => number) {
  const config = createConfig(() => read.current, columnTop)

  return wireCreateGesture(config)
}

/** One day's pointer-create wiring: a stable gesture handler set over the track's own ref,
 *  reading live props through `read` so neither the gesture nor its config goes stale. */
export default function useTrack(props: GridDayProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const read = useRef(props)

  read.current = props
  const columnTop = () => trackRef.current?.getBoundingClientRect().top ?? 0
  const [gesture] = useState(() => buildGesture(read, columnTop))

  return { trackRef, columnTop, gesture }
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
