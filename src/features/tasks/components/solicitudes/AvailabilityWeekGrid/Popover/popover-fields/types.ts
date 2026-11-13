import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { AvailabilityRangeItemFields } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import type { PopoverChangeFieldHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'

/** Everything buildPopoverFields needs to build the three labeled controls: the range's stable
 *  identity, the draft values to show, its error if any, and whether editing is allowed. */
export type PopoverFieldsInput = {
  range: EditableRange
  draft: PopoverDraft
  error: RangeValidationError | undefined
  dayLabel: string
  readOnly: boolean
  changeField: PopoverChangeFieldHandler
}

/** The three labeled controls Popover renders, reusing AvailabilityRangeItem's own field shape. */
export type PopoverFields = AvailabilityRangeItemFields

/** applyReadOnly's input: the fields view-model/fields built, plus whether to disable them. */
export type ReadOnlyOverlay = {
  fields: AvailabilityRangeItemFields
  readOnly: boolean
}
