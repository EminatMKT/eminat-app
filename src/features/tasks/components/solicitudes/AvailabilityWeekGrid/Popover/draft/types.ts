import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

/** The three fields a Popover edits locally before Save commits them. */
export type PopoverDraft = {
  startsAt: string
  endsAt: string
  note: string
}

/** Everything validateDraft needs to check one range's draft against the rest of its day. */
export type ValidateDraftInput = {
  ranges: WeeklyAvailabilityRange[]
  rangeIndex: number
  draft: PopoverDraft
}
