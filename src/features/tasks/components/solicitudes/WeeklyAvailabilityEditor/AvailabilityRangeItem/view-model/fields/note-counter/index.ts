import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import RANGE_FIELD_CONSTANTS from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import AVAILABILITY_RANGE_ITEM_CONSTANTS from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'
import type { NoteCounterProps } from './types'

/** The note field's character counter: always-visible remaining count, flagged near the limit. */
export default function noteCounterProps(value: string, translate: Translator): NoteCounterProps {
  const max = RANGE_FIELD_CONSTANTS.noteMaxLength
  const remaining = max - value.length
  const vars = { remaining }
  const threshold = AVAILABILITY_RANGE_ITEM_CONSTANTS.noteCounterWarningThreshold

  return {
    counterText: translate(EDITOR_COPY.noteCharactersRemaining, vars),
    counterNearLimit: value.length >= max * threshold,
  }
}

// noteCounterProps isolates the note field's counter math so AvailabilityRangeItem's view-model
// builder doesn't grow past its own line budget touching it.
