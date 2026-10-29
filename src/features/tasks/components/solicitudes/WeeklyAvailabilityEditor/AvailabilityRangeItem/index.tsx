import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import buildAvailabilityRangeItemViewModel from './view-model'
import type { AvailabilityRangeItemProps } from './types'

const ItemAction = Button

export default function AvailabilityRangeItem(props: AvailabilityRangeItemProps) {
  const { t } = useT()
  const viewModel = buildAvailabilityRangeItemViewModel(props, t)

  return (
    <>
      <RangeField {...viewModel.startField} />
      <RangeField {...viewModel.endField} />
      <RangeField {...viewModel.noteField} />
      <ItemAction {...viewModel.removeButton} />
    </>
  )
}

// AvailabilityRangeItem composes one editable availability range with its guarded action: the
// view model already wires the remove button through the translated confirmation prompt.
