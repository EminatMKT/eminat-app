import type { WeeklyAvailabilityRange, RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'

/** The slice of PopoverControllerProps deriveDraftValidation needs: the range being edited, its
 *  day's other ranges, its own index among them, and whether it was just created unsaved. */
export type DraftValidationScope = {
  range: EditableRange
  ranges: WeeklyAvailabilityRange[]
  rangeIndex: number
  isNewlyCreated: boolean
}

/** Whether the draft is safe to save, and the validation error to show if it is not. */
export type DraftValidation = {
  error: RangeValidationError | undefined
  canSave: boolean
}
