import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityMemberDto, AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { SaveSuccessOutcome } from './save-decision/types'
import useWeeklyAvailabilityEditorController from './index'
import resolveSaveOutcome from './resolve-save-outcome'
import type { ControllerProps, WeeklyAvailabilityEditorControllerResult } from './types'

vi.mock('./resolve-save-outcome', () => ({ default: vi.fn() }))

const MEMBER_RANGE = {
  id: 'monday-1',
  weekday: 1 as const,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: null,
  workday: { id: 'workday-1', name: 'Full time', hoursPerDay: 8 },
  ranges: [MEMBER_RANGE],
  canEdit: true,
}
const onCancel = vi.fn()
const onSaved = vi.fn()
const PROBE_PROPS: ControllerProps = { member: MEMBER, onCancel, onSaved }
const SAVED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }

let seen: WeeklyAvailabilityEditorControllerResult | null = null
function Probe() {
  seen = useWeeklyAvailabilityEditorController(PROBE_PROPS)
  return null
}

describe('useWeeklyAvailabilityEditorController', () => {
  it('derives the initial state, view model, and validation focus token from the member', () => {
    renderToStaticMarkup(createElement(Probe))

    expect(seen?.state.ranges).toHaveLength(1)
    expect(seen?.errors).toEqual([])
    expect(seen?.viewModel.monday.ranges).toHaveLength(1)
    expect(seen?.validationFocusToken).toBe(0)
  })

  it('forwards cancel to the caller without touching persisted data', () => {
    renderToStaticMarkup(createElement(Probe))
    seen?.onCancel()

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onSaved exactly once per successful save, from the async body, not a setState updater', async () => {
    renderToStaticMarkup(createElement(Probe))
    const renderedState = seen?.state
    if (!renderedState) throw new Error('Probe did not render a state')
    const successOutcome: SaveSuccessOutcome = {
      kind: 'save-success',
      state: renderedState,
      response: SAVED_RESPONSE,
      onSaved,
      shouldFocusValidation: false,
    }
    vi.mocked(resolveSaveOutcome).mockResolvedValueOnce(successOutcome)

    await seen?.onSave()

    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onSaved).toHaveBeenCalledWith(SAVED_RESPONSE)
  })
})

// Limits itself to what renderToStaticMarkup can observe: the initial shape and a pure pass-through.
