import { describe, expect, it } from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import createInitialEditorState from './index'

const MEMBER_RANGE = {
  id: 'tuesday-1',
  weekday: 2 as const,
  startsAt: '08:30',
  endsAt: '12:30',
  note: null,
}
const MEMBER: AvailabilityMemberDto = {
  id: 'member-initial',
  name: 'Initial Member',
  team: null,
  workday: null,
  ranges: [MEMBER_RANGE],
  canEdit: true,
}

describe('createInitialEditorState', () => {
  it('keys every persisted range by its id and starts idle with no message', () => {
    const state = createInitialEditorState(MEMBER)
    const expectedRange = { ...MEMBER_RANGE, clientId: MEMBER_RANGE.id }

    expect(state.ranges).toEqual([expectedRange])
    expect(state.status).toBe(EDITOR_COPY.idleStatus)
    expect(state.message).toBe(EDITOR_COPY.emptyMessage)
    expect(state.pendingRemoval).toBeNull()
  })
})
