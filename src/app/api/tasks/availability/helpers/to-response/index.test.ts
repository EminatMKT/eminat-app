import { describe, expect, it } from 'vitest'
import toAvailabilityResponse from '.'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'
import { VIEWER_ID } from '../test-fixtures/constants'

const TEAMMATE_ID = 'teammate-1'

describe('toAvailabilityResponse', () => {
  it('groups one range per member and marks only the viewer editable', () => {
    const viewerRow = {
      user_id: VIEWER_ID,
      first_name: 'Ada',
      last_name: 'Lovelace',
      team_id: 'team-1',
      team_name: 'Marketing',
      workday_id: 'workday-1',
      workday_name: 'Jornada completa',
      hours_per_week: 40,
      range_id: 'range-1',
      weekday: 1,
      starts_at: '09:00:00',
      ends_at: '12:00:00',
      note: 'Mañanas',
    }
    const teammateRow = {
      user_id: TEAMMATE_ID,
      first_name: 'Grace',
      last_name: 'Hopper',
      team_id: 'team-1',
      team_name: 'Marketing',
      workday_id: null,
      workday_name: null,
      hours_per_week: null,
      range_id: null,
      weekday: null,
      starts_at: null,
      ends_at: null,
      note: null,
    }
    const rows = [viewerRow, teammateRow]
    const response = toAvailabilityResponse(rows, VIEWER_ID)

    expect(response.viewerUserId).toBe(VIEWER_ID)
    expect(response.members).toHaveLength(2)

    const viewerMember = response.members.find((member) => member.id === VIEWER_ID)
    const expectedViewerRange = {
      id: 'range-1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: 'Mañanas',
    }
    const expectedViewerMember = {
      id: VIEWER_ID,
      name: 'Ada Lovelace',
      team: { id: 'team-1', name: 'Marketing' },
      workday: { id: 'workday-1', name: 'Jornada completa', hoursPerWeek: 40 },
      ranges: [expectedViewerRange],
      canEdit: true,
    }

    expect(viewerMember).toEqual(expectedViewerMember)

    const teammateMember = response.members.find((member) => member.id === TEAMMATE_ID)
    const expectedTeammateMember = {
      id: TEAMMATE_ID,
      name: 'Grace Hopper',
      team: { id: 'team-1', name: 'Marketing' },
      workday: null,
      ranges: [],
      canEdit: false,
    }

    expect(teammateMember).toEqual(expectedTeammateMember)
  })

  it('collects every range for a member with several, in row order', () => {
    const firstRange: AvailabilityRow = {
      user_id: VIEWER_ID,
      first_name: 'Ada',
      last_name: 'Lovelace',
      team_id: null,
      team_name: null,
      workday_id: null,
      workday_name: null,
      hours_per_week: null,
      range_id: 'range-1',
      weekday: 1,
      starts_at: '09:00:00',
      ends_at: '12:00:00',
      note: null,
    }
    const secondRange: AvailabilityRow = {
      ...firstRange,
      range_id: 'range-2',
      weekday: 2,
      starts_at: '13:00:00',
      ends_at: '17:00:00',
    }
    const rows = [firstRange, secondRange]
    const response = toAvailabilityResponse(rows, VIEWER_ID)

    expect(response.members).toHaveLength(1)
    expect(response.members[0]?.ranges).toHaveLength(2)
    expect(response.members[0]?.team).toBeNull()
  })

  it('returns a memberless response for an empty row set', () => {
    const emptyRows: Parameters<typeof toAvailabilityResponse>[0] = []
    const response = toAvailabilityResponse(emptyRows, VIEWER_ID)
    const expectedResponse = { viewerUserId: VIEWER_ID, members: [] }

    expect(response).toEqual(expectedResponse)
  })
})
