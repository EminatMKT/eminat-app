import type { RangeValidationError } from '@/features/tasks/utils/availability'

export type ProjectDayErrorsInput = {
  errors: RangeValidationError[]
  rangeIndex: number
}
