import type { AvailabilityWeekGridProps, GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { PopoverSaveHandler, PopoverRemoveHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'

type MutationProps = Pick<AvailabilityWeekGridProps, 'ranges' | 'readOnly' | 'onChange'>

export type GridActionContext = MutationProps & {
  select: (clientId: string | null) => void
}

export type GridActions = Pick<GridDayProps, 'onCreate' | 'onAdd' | 'onOpen'> & {
  onSave: PopoverSaveHandler
  onRemove: PopoverRemoveHandler
  onClose: () => void
}
