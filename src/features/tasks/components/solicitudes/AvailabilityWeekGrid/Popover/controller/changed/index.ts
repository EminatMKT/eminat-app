import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'

/** True once the draft diverges from the range it started from, in any of its three fields. A
 *  blank note and a `null` one count as the same "no note" state. */
export default function draftChanged(
  { startsAt, endsAt, note }: PopoverDraft,
  { startsAt: rangeStartsAt, endsAt: rangeEndsAt, note: rangeNote }: EditableRange,
): boolean {
  return startsAt !== rangeStartsAt
    || endsAt !== rangeEndsAt
    || (note || undefined) !== (rangeNote || undefined)
}

// Popover's Save button stays disabled until this returns true, so an untouched range never
// looks editable.
