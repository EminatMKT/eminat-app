import { createElement } from 'react'
import type { ReactElement } from 'react'
import AvailabilityRangeItem from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem'
import type { AvailabilityRangeItemProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type {
  DaySectionRangeContext,
  DaySectionRange,
  DaySectionRangeItemArgs,
  DaySectionRanges,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DaySection/types'

export default function renderRangeItems(
  ranges: DaySectionRanges,
  context: DaySectionRangeContext,
): ReactElement[] {
  const {
    label,
    errors,
    onChangeRange,
    onRemoveRange,
  } = context
  const renderRange = (range: DaySectionRange, rangeIndex: number): ReactElement => {
    const rangeNumber = rangeIndex + EDITOR_COPY.firstRangeNumber
    const itemProps: AvailabilityRangeItemProps = {
      range,
      rangeIndex,
      number: rangeNumber,
      dayLabel: label,
      errors,
      onChange: onChangeRange,
      onRemove: onRemoveRange,
    }
    const itemAttributes = { ...itemProps, key: range.clientId }
    const item = createElement(AvailabilityRangeItem, itemAttributes)
    return item
  }
  const items = ranges.map(renderRange)
  return items
}

// This renderer gives each availability item its stable client identity and child props.
