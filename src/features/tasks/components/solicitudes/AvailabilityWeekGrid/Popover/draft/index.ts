import { validateRanges } from '@/features/tasks/utils/availability'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { ValidateDraftInput } from './types'

/** Checks one range's local draft against the rest of its day, by substituting the draft's
 *  times into a copy of the week's ranges and running the same `validateRanges` the committed
 *  week already uses — so a draft is never valid by a rule the saved data wouldn't also pass. */
export default function validateDraft(
  input: ValidateDraftInput,
): RangeValidationError | undefined {
  const { ranges, rangeIndex, draft } = input

  const substitutedRanges = ranges.map((range, index) => (
    index === rangeIndex
      ? { ...range, startsAt: draft.startsAt, endsAt: draft.endsAt }
      : range
  ))
  const errors = validateRanges(substitutedRanges)

  return errors.find(error => error.rangeIndex === rangeIndex)
}

// validateDraft isolates the substitute-and-revalidate step so Popover's edit mode never
// reimplements hasOverlap or time parsing on its own.
