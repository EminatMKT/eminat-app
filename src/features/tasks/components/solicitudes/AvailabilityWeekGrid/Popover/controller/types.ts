import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { RangeField } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import type { PopoverProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'

export type PopoverChangeFieldHandler = (field: RangeField, value: string) => void

/** What usePopoverController needs from Popover's own props: everything except the
 *  display-only and dialog-lifecycle fields it never touches. */
export type PopoverControllerProps = Pick<
  PopoverProps, 'range' | 'rangeIndex' | 'ranges' | 'isNewlyCreated' | 'onSave' | 'onRemove'
>

/** Everything Popover's component needs from its controller: the local draft, whether it is
 *  safe to save, and the three handlers that mutate or commit it. */
export type PopoverControllerResult = {
  draft: PopoverDraft
  error: RangeValidationError | undefined
  canSave: boolean
  changeField: PopoverChangeFieldHandler
  save: () => void
  remove: () => void
}
