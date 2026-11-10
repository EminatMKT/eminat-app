import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { AVAILABILITY_RANGE_ITEM_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'
import { RANGE_FIELD_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import type { FieldSpec } from './types'

// The editor values a range item's three fields are built from, gathered here so the builder and
// its note counter read them from one place.

/** The start field: its id suffix, the key of its name and the range key it edits. */
export const START_SPEC: FieldSpec = {
  idSuffix: AVAILABILITY_RANGE_ITEM_CONSTANTS.startIdSuffix,
  nameKey: EDITOR_COPY.startTime,
  field: EDITOR_COPY.startsAtField,
}

/** The end field: its id suffix, the key of its name and the range key it edits. */
export const END_SPEC: FieldSpec = {
  idSuffix: AVAILABILITY_RANGE_ITEM_CONSTANTS.endIdSuffix,
  nameKey: EDITOR_COPY.endTime,
  field: EDITOR_COPY.endsAtField,
}

/** The note field: its id suffix, the key of its name and the range key it edits. */
export const NOTE_SPEC: FieldSpec = {
  idSuffix: AVAILABILITY_RANGE_ITEM_CONSTANTS.noteIdSuffix,
  nameKey: EDITOR_COPY.note,
  field: EDITOR_COPY.noteField,
}

/** Joins the day label and the field name into one accessible label. */
export const LABEL_SEPARATOR = AVAILABILITY_RANGE_ITEM_CONSTANTS.labelSeparator

/** The input type of the start and end fields. */
export const TIME_INPUT_TYPE = RANGE_FIELD_CONSTANTS.timeInputType

/** The input type of the note field. */
export const NOTE_INPUT_TYPE = RANGE_FIELD_CONSTANTS.textareaInputType

/** The note value of a range saved without one. */
export const EMPTY_NOTE = EDITOR_COPY.emptyNote

/** The share of the note limit past which the counter is flagged. */
export const NOTE_WARNING_THRESHOLD = AVAILABILITY_RANGE_ITEM_CONSTANTS.noteCounterWarningThreshold

/** The i18n key of the note's remaining-characters counter. */
export const NOTE_COUNTER_KEY = EDITOR_COPY.noteCharactersRemaining
