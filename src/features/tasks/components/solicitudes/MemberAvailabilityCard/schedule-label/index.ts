import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { useT } from '@/shared/i18n'
import { EDIT_SCHEDULE_KEY, OPEN_SCHEDULE_KEY } from '../constants'

/** The card's accessible name: "edit" for the viewer's own row, "open" for a teammate's. */
export default function useScheduleLabel(member: AvailabilityMemberDto): string {
  const { t } = useT()
  const labelKey = member.canEdit ? EDIT_SCHEDULE_KEY : OPEN_SCHEDULE_KEY
  const nameVars = { name: member.name }

  return t(labelKey, nameVars)
}

// Names the whole-card control for assistive technology, by whether this card is editable.
