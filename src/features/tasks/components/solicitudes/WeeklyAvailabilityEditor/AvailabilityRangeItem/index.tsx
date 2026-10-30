import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import Box from './Box'
import s from './index.module.css'
import buildAvailabilityRangeItemViewModel from './view-model'
import type { AvailabilityRangeItemProps } from './types'

const ItemAction = Button

export default function AvailabilityRangeItem(props: AvailabilityRangeItemProps) {
  const { t } = useT()
  const viewModel = buildAvailabilityRangeItemViewModel(props, t)

  return (
    <Box as="li" className={s.item}>
      <Box className={s.times}>
        <RangeField {...viewModel.startField} />
        <RangeField {...viewModel.endField} />
      </Box>
      <RangeField {...viewModel.noteField} />
      <Box className={s.removeWrap}>
        <ItemAction {...viewModel.removeButton} />
      </Box>
    </Box>
  )
}

// AvailabilityRangeItem composes one editable availability range with its guarded action: the
// view model already wires the remove button through the translated confirmation prompt.
