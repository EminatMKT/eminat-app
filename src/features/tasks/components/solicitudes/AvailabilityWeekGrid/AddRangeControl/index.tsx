'use client'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import DAY_SECTION_CONSTANTS
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DaySection/constants'
import EDITOR_COPY
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import nextSlot from './next-slot'
import type { AddRangeControlProps } from './types'

const NO_ROOM_LEFT_KEY = 'tasks.availability.dayFullyBooked'

/** The button that offers a day's next free range, disabled with its reason once `nextSlot`
 *  finds no room left — deliberately secondary: the editor's primary action is `save`, not
 *  any one day's add-range control. */
export default function AddRangeControl(props: AddRangeControlProps) {
  const { day, ranges, onAdd } = props
  const { t } = useT()
  const slot = nextSlot(ranges)
  const noRoomLeft = slot === null
  const labelVars = { day: t(day.labelKey) }
  const label = t(EDITOR_COPY.addRange, labelVars)
  const disabledReason = noRoomLeft ? t(NO_ROOM_LEFT_KEY) : undefined
  const handleAdd = () => {
    if (slot !== null) onAdd(slot)
  }

  return (
    <Button
      kind={DAY_SECTION_CONSTANTS.addButtonKind}
      onClick={handleAdd}
      label={label}
      deshabilitado={noRoomLeft}
      disabledReason={disabledReason}
    />
  )
}

// AddRangeControl offers one day's next free range through the shared action button — it
// never computes the slot or decides disabled-ness anywhere but through nextSlot's result.
