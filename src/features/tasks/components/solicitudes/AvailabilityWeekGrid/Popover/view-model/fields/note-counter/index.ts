import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import { RANGE_FIELD_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import { NOTE_COUNTER_KEY, NOTE_WARNING_THRESHOLD } from '../constants'
import type { NoteCounterProps } from './types'

/** The note field's character counter: always-visible remaining count, flagged near the limit. */
export default function noteCounterProps(value: string, translate: Translator): NoteCounterProps {
  const max = RANGE_FIELD_CONSTANTS.noteMaxLength
  const vars = { remaining: max - value.length }

  return {
    counterText: translate(NOTE_COUNTER_KEY, vars),
    counterNearLimit: value.length >= max * NOTE_WARNING_THRESHOLD,
  }
}

// noteCounterProps isolates the note field's counter math so AvailabilityRangeItem's view-model
// builder doesn't grow past its own line budget touching it.
