import isActivationKey from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/activation-key'
import nextFreeSlot from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/next-free-slot'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { DayRange } from '../types'

type TrackKeyEvent = {
  key: string
  preventDefault: () => void
}

function handleTrackKeydown(props: GridDayProps, dayRanges: DayRange[]) {
  return (event: TrackKeyEvent) => {
    if (!isActivationKey(event.key)) return

    event.preventDefault()
    const slot = nextFreeSlot(dayRanges)

    if (slot !== null) props.onAdd(props.day, slot)
  }
}

/** The day track's own Enter/Space handler: creates the day's next free default range,
 *  reusing the mechanism the old AddRangeControl button used to trigger. `undefined` when
 *  the grid is read-only, matching keyboardAttrs' "no attrs at all" contract. */
export default function trackKeydown(
  props: GridDayProps,
  dayRanges: DayRange[],
): ((event: TrackKeyEvent) => void) | undefined {
  if (props.readOnly) return undefined

  return handleTrackKeydown(props, dayRanges)
}

// trackKeydown is the track's only key-handling decision: everything else about adding a
// range still flows through the same onAdd the grid wires for pointer-created ranges.
