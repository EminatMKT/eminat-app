import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import useLocalDraft from './index'
import type { LocalDraft } from './types'

const EMPTY_NOTE = ''
const RANGE: EditableRange = {
  clientId: 'range-client-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}

let currentRange = RANGE
let seen: LocalDraft | null = null

function Probe() {
  seen = useLocalDraft(currentRange)

  return null
}

describe('useLocalDraft', () => {
  it('seeds the draft from the range', () => {
    currentRange = RANGE
    renderToStaticMarkup(createElement(Probe))
    const expectedDraft: PopoverDraft = {
      startsAt: RANGE.startsAt,
      endsAt: RANGE.endsAt,
      note: RANGE.note,
    }

    expect(seen?.draft).toEqual(expectedDraft)
  })

  it('normalizes a missing note to an empty string', () => {
    currentRange = { ...RANGE, note: null }
    renderToStaticMarkup(createElement(Probe))

    expect(seen?.draft.note).toBe(EMPTY_NOTE)
  })
})

// changeField's merge behavior is exercised through usePopoverController's own test and through
// draftChanged's unit tests; renderToStaticMarkup cannot observe a second render after calling it.
