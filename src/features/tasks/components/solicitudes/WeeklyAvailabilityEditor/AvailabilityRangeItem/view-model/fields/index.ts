import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import AVAILABILITY_RANGE_ITEM_CONSTANTS from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'
import RANGE_FIELD_CONSTANTS from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type {
  AvailabilityRangeItemFields,
  AvailabilityRangeItemProps,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import resolveRangeErrorCopy from '../range-error-copy'
import noteCounterProps from './note-counter'

export default function buildAvailabilityRangeItemFields(props: AvailabilityRangeItemProps, translate: Translator): AvailabilityRangeItemFields {
  const {
    range,
    rangeIndex,
    dayLabel,
    errors,
    onChange,
  } = props
  const rangeErrorInput = { errors, rangeIndex, translate }
  const timeError = resolveRangeErrorCopy(rangeErrorInput)
  const startId = `${range.clientId}${AVAILABILITY_RANGE_ITEM_CONSTANTS.startIdSuffix}`
  const endId = `${range.clientId}${AVAILABILITY_RANGE_ITEM_CONSTANTS.endIdSuffix}`
  const noteId = `${range.clientId}${AVAILABILITY_RANGE_ITEM_CONSTANTS.noteIdSuffix}`
  const startLabel = [dayLabel, translate(EDITOR_COPY.startTime)].join(AVAILABILITY_RANGE_ITEM_CONSTANTS.labelSeparator)
  const endLabel = [dayLabel, translate(EDITOR_COPY.endTime)].join(AVAILABILITY_RANGE_ITEM_CONSTANTS.labelSeparator)
  const noteLabel = [dayLabel, translate(EDITOR_COPY.note)].join(AVAILABILITY_RANGE_ITEM_CONSTANTS.labelSeparator)
  const changeStart = (value: string) => onChange(range.clientId, EDITOR_COPY.startsAtField, value)
  const changeEnd = (value: string) => onChange(range.clientId, EDITOR_COPY.endsAtField, value)
  const changeNote = (value: string) => onChange(range.clientId, EDITOR_COPY.noteField, value)
  const startField: RangeFieldProps = {
    id: startId,
    inputType: RANGE_FIELD_CONSTANTS.timeInputType,
    label: startLabel,
    value: range.startsAt,
    error: timeError,
    onChange: changeStart,
  }
  const endField: RangeFieldProps = {
    id: endId,
    inputType: RANGE_FIELD_CONSTANTS.timeInputType,
    label: endLabel,
    value: range.endsAt,
    error: timeError,
    onChange: changeEnd,
  }
  const noteValue = range.note ?? EDITOR_COPY.emptyNote
  const noteField: RangeFieldProps = {
    id: noteId,
    inputType: RANGE_FIELD_CONSTANTS.textInputType,
    label: noteLabel,
    value: noteValue,
    ...noteCounterProps(noteValue, translate),
    onChange: changeNote,
  }
  const fields: AvailabilityRangeItemFields = { startField, endField, noteField }
  return fields
}

// This builder prepares the three labeled controls before AvailabilityRangeItem renders them.
