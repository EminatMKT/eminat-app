import { describe, expect, it } from 'vitest'
import appendRange from '.'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'
import { VIEWER_ID } from '../test-fixtures/constants'

const memberOnlyRow: AvailabilityRow = {
  user_id: VIEWER_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  team_id: null,
  team_name: null,
  workday_id: null,
  workday_name: null,
  hours_per_week: null,
  range_id: null,
  weekday: null,
  starts_at: null,
  ends_at: null,
  note: null,
}

function buildEmptyMember(): AvailabilityMemberDto {
  const member: AvailabilityMemberDto = {
    id: VIEWER_ID,
    name: 'Ada Lovelace',
    team: null,
    workday: null,
    ranges: [],
    canEdit: true,
  }

  return member
}

describe('appendRange', () => {
  it('leaves a member-only row without a range', () => {
    const member = buildEmptyMember()

    appendRange(member, memberOnlyRow)
    expect(member.ranges).toEqual([])
  })

  it('appends a canonical HH:mm range when the row carries one', () => {
    const member = buildEmptyMember()
    const rangeRow: AvailabilityRow = {
      ...memberOnlyRow,
      range_id: 'range-1',
      weekday: 1,
      starts_at: '09:00:00',
      ends_at: '12:00:00',
      note: 'Mañanas',
    }
    const expectedRange = {
      id: 'range-1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: 'Mañanas',
    }

    appendRange(member, rangeRow)
    expect(member.ranges).toEqual([expectedRange])
  })
})
