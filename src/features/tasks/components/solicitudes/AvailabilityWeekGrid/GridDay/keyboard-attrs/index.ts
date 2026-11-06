import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import trackKeydown from '../track-keydown'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { TrackInput } from '../types'

const FOCUSABLE_TAB_INDEX = 0

type KeyboardAttrs = Partial<{
  tabIndex: number
  'aria-label': string
  onKeyDown: ReturnType<typeof trackKeydown>
}>

function ariaLabelOf(props: GridDayProps, trackInput: TrackInput) {
  const dayLabel = trackInput.t(props.day.labelKey)
  const labelVars = { day: dayLabel }

  return trackInput.t(EDITOR_COPY.addRangeHint, labelVars)
}

function editableAttrs(props: GridDayProps, trackInput: TrackInput): KeyboardAttrs {
  const attrs = {
    tabIndex: FOCUSABLE_TAB_INDEX,
    'aria-label': ariaLabelOf(props, trackInput),
    onKeyDown: trackKeydown(props, trackInput.dayRanges),
  }

  return attrs
}

/** The day track's own keyboard affordance: a focus target and its aria-label, replacing the
 *  old visible add-range button. Empty when the grid is read-only, so a view-only track never
 *  receives a tab stop or a handler. */
export default function keyboardAttrs(props: GridDayProps, trackInput: TrackInput): KeyboardAttrs {
  if (props.readOnly) return {}

  return editableAttrs(props, trackInput)
}

// keyboardAttrs owns the track's focusability decision only; the handler itself still comes
// from trackKeydown, and the default range it creates still comes from nextFreeSlot.
