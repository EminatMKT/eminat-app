import { describe, expect, it } from 'vitest'
import buildMember from '.'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'

const baseRow: AvailabilityRow = {
  user_id: 'viewer-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  team_id: null,
  team_name: null,
  workday_id: null,
  workday_name: null,
  hours_per_day: null,
  range_id: null,
  weekday: null,
  starts_at: null,
  ends_at: null,
  note: null,
}

describe('buildMember', () => {
  it('joins first and last name, and marks the viewer editable', () => {
    const member = buildMember(baseRow, 'viewer-1')
    expect(member.id).toBe('viewer-1')
    expect(member.name).toBe('Ada Lovelace')
    expect(member.canEdit).toBe(true)
    expect(member.ranges).toEqual([])
  })

  it('marks a teammate as not editable', () => {
    const member = buildMember(baseRow, 'someone-else')
    expect(member.canEdit).toBe(false)
  })

  it('reports no team or workday when either column is null', () => {
    const member = buildMember(baseRow, 'viewer-1')
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
      hours_per_day: 8,
    }
    const member = buildMember(rowWithTeamAndWorkday, 'viewer-1')
    const expectedTeam = { id: 'team-1', name: 'Marketing' }
    const expectedWorkday = { id: 'workday-1', name: 'Jornada completa', hoursPerDay: 8 }
    expect(member.team).toEqual(expectedTeam)
    expect(member.workday).toEqual(expectedWorkday)
  })
})
