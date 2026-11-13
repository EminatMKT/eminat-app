import { createElement } from 'react'
import { hhmmOf } from '@/features/tasks/utils/availability'
import { DAY_END_MINUTE, SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { OPTION } from '@/shared/constants/dom'

function renderOption(value: string) {
  const optionProps = { key: value, value }
  const option = createElement(OPTION, optionProps, value)

  return option
}

/** Offers half-hour end times through 24:00 without dropping an existing off-step value. */
export default function renderEndOptions(currentValue: string) {
  const range = { length: DAY_END_MINUTE / SNAP_MINUTES + 1 }
  const values = Array.from(range, (_, index) => hhmmOf(index * SNAP_MINUTES))

  if (currentValue && !values.includes(currentValue)) values.push(currentValue)

  const options = values.map(renderOption)

  return options
}

// End choices include the exclusive day boundary and retain previously saved minute precision.
