import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import AvailabilityRangeItemControls from './AvailabilityRangeItemControls'
import AvailabilityRangeItemFrame from './AvailabilityRangeItemFrame'
import buildAvailabilityRangeItemViewModel from './view-model'
import type { AvailabilityRangeItemProps } from './types'

const Frame = AvailabilityRangeItemFrame

const ItemAction = Button

export default function AvailabilityRangeItem(props: AvailabilityRangeItemProps) {
  const viewModel = buildAvailabilityRangeItemViewModel(props, useT().t)

  return (
    <Frame part="item">
      <AvailabilityRangeItemControls {...viewModel} />
      <Frame part="removeWrap"><ItemAction {...viewModel.removeButton} /></Frame>
    </Frame>
  )
}

// AvailabilityRangeItem composes one editable availability range with its guarded action: the
// view model already wires the remove button through the translated confirmation prompt.
