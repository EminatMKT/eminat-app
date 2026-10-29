import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import buildAvailabilityRangeItemFields from './fields'
import confirmRemoval from '../confirm-removal'
import AVAILABILITY_RANGE_ITEM_CONSTANTS from '../constants'
import type {
  AvailabilityRangeItemProps,
  AvailabilityRangeItemViewModel,
} from '../types'

function buildRemoveLabel(dayLabel: string, rangeNumber: number) {
  const numberText = String(rangeNumber)
  const dayLabelCopy = EDITOR_COPY.removeRange.replace(EDITOR_COPY.dayToken, dayLabel)
  const removeLabel = dayLabelCopy.replace(EDITOR_COPY.numberToken, numberText)
  return removeLabel
}

export default function buildAvailabilityRangeItemViewModel(props: AvailabilityRangeItemProps): AvailabilityRangeItemViewModel {
  const {
    range,
    number,
    dayLabel,
    removeLabel: providedRemoveLabel,
    confirmationMessage: providedConfirmationMessage,
    onRemove,
  } = props
  const fields = buildAvailabilityRangeItemFields(props)
  const removeLabel = providedRemoveLabel ?? buildRemoveLabel(dayLabel, number)
  const confirmationMessage = providedConfirmationMessage ?? EDITOR_COPY.removeConfirm
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
