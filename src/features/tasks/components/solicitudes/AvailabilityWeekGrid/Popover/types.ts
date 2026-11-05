import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'

export type PopoverSaveHandler = (clientId: string, times: PopoverDraft) => void

export type PopoverRemoveHandler = (clientId: string) => void

/** One range's edit/view dialog: Block opens it on activation, always in edit mode unless
 *  `readOnly` says the viewer cannot change this member's availability. */
export type PopoverProps = {
  range: EditableRange
  rangeIndex: number
  ranges: WeeklyAvailabilityRange[]
  dayLabel: string
  readOnly: boolean
  onSave: PopoverSaveHandler
  onRemove: PopoverRemoveHandler
  onClose: () => void
}
