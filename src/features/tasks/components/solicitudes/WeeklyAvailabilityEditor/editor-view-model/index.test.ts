import { describe, expect, it } from 'vitest'
import type { EditableRange } from '../component-types'
import buildWeeklyAvailabilityEditorViewModel from '.'

const MONDAY = 1
const TUESDAY = 2
const MONDAY_RANGE: EditableRange = {
  clientId: 'monday-1',
  weekday: MONDAY,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const TUESDAY_RANGE: EditableRange = {
  clientId: 'tuesday-1',
  weekday: TUESDAY,
  startsAt: '10:00',
  endsAt: '14:00',
  note: null,
}
const RANGES = [MONDAY_RANGE, TUESDAY_RANGE]
const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerDay: 8 }
const EMPTY_ERRORS = []

describe('buildWeeklyAvailabilityEditorViewModel', () => {
  it('projects seven day props and weekly declared hours from editor data', () => {
    const input = { ranges: RANGES, workday: WORKDAY, errors: EMPTY_ERRORS }
    const viewModel = buildWeeklyAvailabilityEditorViewModel(input)

    expect(viewModel.monday.ranges).toEqual([MONDAY_RANGE])
    expect(viewModel.tuesday.ranges).toEqual([TUESDAY_RANGE])
    expect(viewModel.sunday.ranges).toEqual([])
    expect(viewModel.monday.expectedHours).toBe(8)
    expect(viewModel.weeklySummary.declaredHours).toBe(8)
  })

  it('projects validation errors into each weekday range coordinate space', () => {
    const errors = [{ code: 'invalid-time' as const, rangeIndex: 1 }]
    const input = { ranges: RANGES, workday: null, errors }
    const viewModel = buildWeeklyAvailabilityEditorViewModel(input)

    expect(viewModel.tuesday.errors).toEqual([{ code: 'invalid-time', rangeIndex: 0 }])
    expect(viewModel.monday.errors).toEqual([])
    expect(viewModel.sunday.expectedHours).toBeNull()
  })
})
