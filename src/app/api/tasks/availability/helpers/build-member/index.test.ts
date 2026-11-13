import { describe, expect, it } from 'vitest'
import buildMember from '.'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'
import { VIEWER_ID } from '../test-fixtures/constants'

const TEAMMATE_ID = 'someone-else'
const FULL_NAME = 'Ada Lovelace'

const baseRow: AvailabilityRow = {
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

describe('buildMember', () => {
  it('joins first and last name, and marks the viewer editable', () => {
    const member = buildMember(baseRow, VIEWER_ID)

    expect(member.id).toBe(VIEWER_ID)
    expect(member.name).toBe(FULL_NAME)
    expect(member.canEdit).toBe(true)
    expect(member.ranges).toEqual([])
  })

  it('marks a teammate as not editable', () => {
    const member = buildMember(baseRow, TEAMMATE_ID)

    expect(member.canEdit).toBe(false)
  })

  it('reports no team or workday when either column is null', () => {
    const member = buildMember(baseRow, VIEWER_ID)

    expect(member.team).toBeNull()
    expect(member.workday).toBeNull()
  })

  it('serializes a complete team and an active workday', () => {
    const rowWithTeamAndWorkday: AvailabilityRow = {
      ...baseRow,
      team_id: 'team-1',
      team_name: 'Marketing',
      workday_id: 'workday-1',
      workday_name: 'Jornada completa',
      hours_per_week: 40,
    }
    const member = buildMember(rowWithTeamAndWorkday, VIEWER_ID)
    const expectedTeam = { id: 'team-1', name: 'Marketing' }
    const expectedWorkday = { id: 'workday-1', name: 'Jornada completa', hoursPerWeek: 40 }

    expect(member.team).toEqual(expectedTeam)
    expect(member.workday).toEqual(expectedWorkday)
  })
})
