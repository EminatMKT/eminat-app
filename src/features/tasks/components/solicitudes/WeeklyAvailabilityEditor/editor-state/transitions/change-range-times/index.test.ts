import { describe, expect, it } from 'vitest'
import type { EditableRange, LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { ChangeRangeTimesAction } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { Weekday } from '@/features/tasks/utils/availability'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import changeRangeTimes from '.'

const MONDAY: Weekday = 1
const FIRST_RANGE_INDEX = 0
const FIRST_RANGE: EditableRange = {
  clientId: 'range-1',
  weekday: MONDAY,
  startsAt: '09:00',
  endsAt: '12:00',
  note: null,
}
const BASE_STATE: LocalEditorState = {
  ranges: [FIRST_RANGE],
  status: EDITOR_COPY.savedStatus,
  message: EDITOR_COPY.saved,
  pendingRemoval: null,
}
const RESIZE: ChangeRangeTimesAction = {
  kind: 'change-times',
  rangeIndex: FIRST_RANGE_INDEX,
  startsAt: '10:00',
  endsAt: '11:30',
}

describe('changeRangeTimes', () => {
  it('replaces both ends of the target range in one transition', () => {
    const next = changeRangeTimes(BASE_STATE, RESIZE)
    const [resized] = next.ranges

    expect(resized?.startsAt).toBe(RESIZE.startsAt)
    expect(resized?.endsAt).toBe(RESIZE.endsAt)
  })

  it('clears a stale status/message', () => {
    const next = changeRangeTimes(BASE_STATE, RESIZE)

    expect(next.status).toBe(EDITOR_COPY.idleStatus)
    expect(next.message).toBeNull()
  })

  it('leaves the ranges untouched when the index is out of range', () => {
    const outOfRange: ChangeRangeTimesAction = { ...RESIZE, rangeIndex: 5 }
    const next = changeRangeTimes(BASE_STATE, outOfRange)

    expect(next.ranges).toEqual(BASE_STATE.ranges)
  })
})
