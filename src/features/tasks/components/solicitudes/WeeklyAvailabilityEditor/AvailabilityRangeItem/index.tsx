import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import { Button } from '@/shared/components/ui'
import confirmRemoval from './confirm-removal'
import buildAvailabilityRangeItemViewModel from './view-model'
import type { AvailabilityRangeItemProps } from './types'

const ItemAction = Button

export default function AvailabilityRangeItem(props: AvailabilityRangeItemProps) {
  const {
    range,
    confirmationMessage,
    onRemove,
  } = props
  const viewModel = buildAvailabilityRangeItemViewModel(props)
  const removalCopy = confirmationMessage ?? EDITOR_COPY.removeConfirm
  const removeRange = () => onRemove(range.clientId)
  const requestRemoval = () => confirmRemoval(removalCopy, removeRange)
  const removeButtonProps = {
    ...viewModel.removeButton,
    onClick: requestRemoval,
  }

  return (
    <>
      <RangeField {...viewModel.startField} />
      <RangeField {...viewModel.endField} />
      <RangeField {...viewModel.noteField} />
      <ItemAction {...removeButtonProps} />
    </>
  )
}

// AvailabilityRangeItem composes one editable availability range with its guarded action.
