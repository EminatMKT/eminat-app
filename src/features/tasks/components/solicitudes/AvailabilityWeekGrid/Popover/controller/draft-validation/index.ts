import validateDraft from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft'
import type { ValidateDraftInput, PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import draftChanged from '../changed'
import type { DraftValidation, DraftValidationScope } from './types'

/** Combines validateDraft's error with draftChanged, so a draft is only savable once it has
 *  actually moved AND the result still passes the same validation the committed week uses. */
export default function deriveDraftValidation(
  scope: DraftValidationScope,
  draft: PopoverDraft,
): DraftValidation {
  const { range, ranges, rangeIndex } = scope
  const validateInput: ValidateDraftInput = { ranges, rangeIndex, draft }
  const error = validateDraft(validateInput)
  const canSave = draftChanged(draft, range) && !error

  return { error, canSave }
}

// Sits between draft/ (pure range validation) and the controller: the controller only ever asks
// this module "is it safe to save", never validateDraft/draftChanged separately.
