import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type {
  AvailabilityRangeItemFields,
  AvailabilityRangeItemProps,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import resolveRangeErrorCopy from '../range-error-copy'
import noteCounterProps from './note-counter'
import {
  EMPTY_NOTE,
  END_SPEC,
  LABEL_SEPARATOR,
  NOTE_INPUT_TYPE,
  NOTE_SPEC,
  START_SPEC,
  TIME_INPUT_TYPE,
} from './constants'
import type { FieldBase, FieldContext, FieldSpec } from './types'

function contextOf(props: AvailabilityRangeItemProps, translate: Translator): FieldContext {
  const { errors, rangeIndex } = props
  const rangeErrorInput = { errors, rangeIndex, translate }
  const timeError = resolveRangeErrorCopy(rangeErrorInput)

  return { props, translate, timeError }
}

function baseField(context: FieldContext, spec: FieldSpec): FieldBase {
  const { props, translate } = context
  const { idSuffix, nameKey, field } = spec
  const { range, dayLabel, onChange } = props
  const label = [dayLabel, translate(nameKey)].join(LABEL_SEPARATOR)
  const id = `${range.clientId}${idSuffix}`
  const changeField = (value: string) => onChange(range.clientId, field, value)

  return { id, label, onChange: changeField }
}

function timeField(context: FieldContext, spec: FieldSpec, value: string): RangeFieldProps {
  const base = { ...baseField(context, spec), inputType: TIME_INPUT_TYPE }
  const field: RangeFieldProps = { ...base, value, error: context.timeError }

  return field
}

function noteField(context: FieldContext): RangeFieldProps {
  const { props, translate } = context
  const value = props.range.note ?? EMPTY_NOTE
  const base = { ...baseField(context, NOTE_SPEC), inputType: NOTE_INPUT_TYPE, value }
  const field: RangeFieldProps = { ...base, ...noteCounterProps(value, translate) }

  return field
}

/** Builds a range item's three labeled controls: start and end share the range's time error. */
export default function buildAvailabilityRangeItemFields(
  props: AvailabilityRangeItemProps,
  translate: Translator,
): AvailabilityRangeItemFields {
  const context = contextOf(props, translate)
  const startField = timeField(context, START_SPEC, props.range.startsAt)
  const endField = timeField(context, END_SPEC, props.range.endsAt)

  return { startField, endField, noteField: noteField(context) }
}

// This builder prepares the three labeled controls before AvailabilityRangeItem renders them.
