import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { GridActions } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/controller/actions/types'
import type { AvailabilityWeekGridProps, GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'

/** One GridDayProps entry per declared weekday, carrying the shared props and this grid's
 *  action handlers - index.tsx renders one GridDay per entry, keyed by its own weekday. */
export default function dayPropsOf(
  props: AvailabilityWeekGridProps,
  actions: GridActions,
): GridDayProps[] {
  const { onOpen, onCreate, onAdd } = actions
  const shared = {
    ...props,
    onOpen,
    onCreate,
    onAdd,
  }

  return AVAILABILITY_DAYS.map(day => ({ ...shared, day }))
}

// Each day's props differ only in `day`; everything else is the one shared object, spread once.
