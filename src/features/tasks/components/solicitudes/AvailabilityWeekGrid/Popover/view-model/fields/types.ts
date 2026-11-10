import type { I18nKey } from '@/shared/i18n'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import type { RangeField, Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { AvailabilityRangeItemProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'

/** What every field of a range item reads: its props, the translator and the shared time error. */
export type FieldContext = {
  props: AvailabilityRangeItemProps
  translate: Translator
  timeError: RangeFieldProps['error']
}

/** One field's own pieces: its id suffix, the key of its name and the range key it edits. */
export type FieldSpec = {
  idSuffix: string
  nameKey: I18nKey
  field: RangeField
}

/** The pieces every field shares, before its input type and value are added. */
export type FieldBase = Pick<RangeFieldProps, 'id' | 'label' | 'onChange'>
