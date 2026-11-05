import type { WeeklyAvailabilityRange, RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'

/** The slice of PopoverControllerProps deriveDraftValidation needs: the range being edited, plus
 *  its day's other ranges and its own index among them. */
export type DraftValidationScope = {
  range: EditableRange
  ranges: WeeklyAvailabilityRange[]
  rangeIndex: number
}

/** Whether the draft is safe to save, and the validation error to show if it is not. */
export type DraftValidation = {
  error: RangeValidationError | undefined
  canSave: boolean
}
