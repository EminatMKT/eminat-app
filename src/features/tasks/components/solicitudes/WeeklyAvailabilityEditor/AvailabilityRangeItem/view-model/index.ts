import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import buildAvailabilityRangeItemFields from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/view-model/fields'
import confirmRemoval from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/confirm-removal'
import AVAILABILITY_RANGE_ITEM_CONSTANTS from '../constants'
import type {
  AvailabilityRangeItemProps,
  AvailabilityRangeItemViewModel,
} from '../types'

export default function buildAvailabilityRangeItemViewModel(
  props: AvailabilityRangeItemProps,
  translate: Translator,
): AvailabilityRangeItemViewModel {
  const {
    range,
    number,
    dayLabel,
    removeLabel: providedRemoveLabel,
    confirmationMessage: providedConfirmationMessage,
    onRemove,
  } = props
  const fields = buildAvailabilityRangeItemFields(props, translate)
  const removeVars = { day: dayLabel, number }
  const removeLabel = providedRemoveLabel ?? translate(EDITOR_COPY.removeRange, removeVars)
  const confirmationMessage = providedConfirmationMessage ?? translate(EDITOR_COPY.removeConfirm)
  const removeRange = () => onRemove(range.clientId)
  const requestRemoval = () => confirmRemoval(confirmationMessage, removeRange)
  const removeButton = {
    kind: AVAILABILITY_RANGE_ITEM_CONSTANTS.deleteButtonKind,
    iconOnly: true,
    label: removeLabel,
    onClick: requestRemoval,
  }
  const viewModel: AvailabilityRangeItemViewModel = {
    ...fields,
    removeButton,
  }
  return viewModel
}

// This view model keeps field descriptors and the guarded action out of AvailabilityRangeItem JSX.
