import type { PopoverChangeFieldHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'

/** What useLocalDraft returns: the seeded draft value and the setter Popover's fields call. */
export type LocalDraft = {
  draft: PopoverDraft
  changeField: PopoverChangeFieldHandler
}
