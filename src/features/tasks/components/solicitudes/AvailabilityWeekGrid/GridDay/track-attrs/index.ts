import keyboardAttrs from '../keyboard-attrs'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { TrackBundle } from '../types'
import s from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/index.module.css'

function trackClassOf({ readOnly }: GridDayProps) {
  const className = readOnly ? s.track : `${s.track} ${s.editable}`

  return className
}

/** The day track's own DOM attrs: its ref, its class (editable vs read-only), the keyboard
 *  affordance that replaced the old add-range button, then the pointer-create gesture handlers
 *  — in that spread order, so the gesture's own handlers always win if a key ever collided. */
export default function trackAttrs(
  props: GridDayProps,
  { trackRef, gesture, trackInput }: TrackBundle,
) {
  const attrs = {
    ref: trackRef,
    className: trackClassOf(props),
    ...keyboardAttrs(props, trackInput),
    ...gesture,
  }

  return attrs
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
