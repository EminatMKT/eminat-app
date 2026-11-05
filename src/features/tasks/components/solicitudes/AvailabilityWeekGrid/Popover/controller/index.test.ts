import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import usePopoverController from './index'
import type { PopoverDraft } from '../draft/types'
import type { PopoverControllerProps, PopoverControllerResult } from './types'

const RANGE_INDEX = 0
const RANGE: EditableRange = {
  clientId: 'range-client-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const RANGES: WeeklyAvailabilityRange[] = [RANGE]
const onSave = vi.fn()
const onRemove = vi.fn()
const PROPS: PopoverControllerProps = {
  range: RANGE,
  rangeIndex: RANGE_INDEX,
  ranges: RANGES,
  onSave,
  onRemove,
}

let seen: PopoverControllerResult | null = null

function Probe() {
  seen = usePopoverController(PROPS)

  return null
}

describe('usePopoverController', () => {
  it('derives the initial draft, error, and canSave from the range', () => {
    renderToStaticMarkup(createElement(Probe))
    const expectedDraft: PopoverDraft = {
      startsAt: RANGE.startsAt,
      endsAt: RANGE.endsAt,
      note: RANGE.note,
    }

    expect(seen?.draft).toEqual(expectedDraft)
    expect(seen?.error).toBeUndefined()
    expect(seen?.canSave).toBe(false)
  })

  it('does not call onSave while the draft has not changed', () => {
    renderToStaticMarkup(createElement(Probe))
    seen?.save()

    expect(onSave).not.toHaveBeenCalled()
  })

  it('forwards remove to the caller unconditionally', () => {
    renderToStaticMarkup(createElement(Probe))
    seen?.remove()

    expect(onRemove).toHaveBeenCalledWith(RANGE.clientId)
  })
})

// Limits itself to what renderToStaticMarkup can observe, matching this repo's own precedent for
// hook tests (WeeklyAvailabilityEditor/controller): initial shape plus pure pass-through. The
// changed-draft and commit paths are already proven by draftChanged's and validateDraft's own
// unit tests, since canSave is their direct composition.
