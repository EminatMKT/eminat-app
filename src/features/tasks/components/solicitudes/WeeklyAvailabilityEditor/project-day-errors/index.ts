import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { ProjectDayErrorsInput } from './types'

export default function projectDayErrors(
  { errors, rangeIndex }: ProjectDayErrorsInput,
): RangeValidationError[] {
  return errors.filter(error => error.rangeIndex === rangeIndex)
}

// This facade looks up the error(s) that belong to one exact range, addressed by its own
// `rangeIndex` in the full week's `ranges` array — no per-day remapping of that index at all.
