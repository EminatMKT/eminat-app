'use client'
import { useState } from 'react'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverChangeFieldHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import type { LocalDraft } from './types'

function seedDraft({ startsAt, endsAt, note }: EditableRange): PopoverDraft {
  return { startsAt, endsAt, note: note ?? '' }
}

/** Owns the local edit draft, seeded from the range, and the setter Popover's fields call. */
export default function useLocalDraft(range: EditableRange): LocalDraft {
  const [draft, setDraft] = useState<PopoverDraft>(() => seedDraft(range))
  const changeField: PopoverChangeFieldHandler = (field, value) => (
    setDraft(previous => ({ ...previous, [field]: value }))
  )

  return { draft, changeField }
}

// The two fields that change together on every keystroke: the draft value and the one setter
// that mutates it, kept out of usePopoverController so each stays within this repo's line budget.
