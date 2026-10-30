import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import AvailabilityRangeItemFrame from './AvailabilityRangeItemFrame'
import buildAvailabilityRangeItemViewModel from './view-model'
import type { AvailabilityRangeItemProps } from './types'

const Frame = AvailabilityRangeItemFrame

const ItemAction = Button

export default function AvailabilityRangeItem(props: AvailabilityRangeItemProps) {
  const { t } = useT()
  const viewModel = buildAvailabilityRangeItemViewModel(props, t)

  return (
    <Frame part="item">
      <Frame part="times">
        <RangeField {...viewModel.startField} />
        <RangeField {...viewModel.endField} />
      </Frame>
      <RangeField {...viewModel.noteField} />
      <Frame part="removeWrap">
        <ItemAction {...viewModel.removeButton} />
      </Frame>
    </Frame>
  )
}

// AvailabilityRangeItem composes one editable availability range with its guarded action: the
// view model already wires the remove button through the translated confirmation prompt.
