import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'

/** Everything resolveRangeErrorCopy needs to pick and translate ONE range's specific error. */
export type ResolveRangeErrorCopyInput = {
  errors: RangeValidationError[]
  rangeIndex: number
  translate: Translator
}
