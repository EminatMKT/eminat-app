import dayPropsOf from '../day-props'
import popoverOf from '../popover-of'
import summaryOf from '../summary-of'
import type { AvailabilityWeekGridProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { GridViewInput } from '../types'

/** The three shapes index.tsx renders from one controller pass: the per-day props, the
 *  selected popover (or null), and the week's translated summary. */
export default function gridView(props: AvailabilityWeekGridProps, input: GridViewInput) {
  const popoverContext = { props, actions: input.actions, t: input.t }
  const view = {
    days: dayPropsOf(props, input.actions),
    popover: popoverOf(popoverContext, input.selectedId),
    summary: summaryOf(props.ranges, input.t),
  }

  return view
}

// Composing here keeps useGridController itself at setup plus one delegated call.
