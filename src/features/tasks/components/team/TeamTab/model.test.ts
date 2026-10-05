import { describe, expect, it } from 'vitest'
import { taskProjectScope, visiblePeopleIds, visibleWorkload, type TeamMembership } from './model'

const memberships: TeamMembership[] = [
  { project_id: 'shared', user_id: 'worker', project_role: 'Member' },
  { project_id: 'shared', user_id: 'colleague', project_role: 'Reviewer' },
]

describe('Team visibility', () => {
  it('shows the admin all assignable people and a worker only shared members plus self', () => {
    expect(Array.from(visiblePeopleIds(true, ['worker', 'colleague', 'outsider'], 'admin', memberships))).toEqual(['worker', 'colleague', 'outsider'])
    expect(Array.from(visiblePeopleIds(false, [], 'worker', memberships))).toEqual(['worker', 'colleague'])
  })

  it('restricts another member’s task query to visible projects', () => {
    expect(taskProjectScope(false, 'worker', 'colleague', memberships)).toEqual(['shared'])
    expect(taskProjectScope(false, 'worker', 'outsider', memberships)).toEqual([])
    expect(taskProjectScope(false, 'worker', 'worker', memberships)).toBeNull()
    expect(taskProjectScope(true, 'admin', 'colleague', memberships)).toBeNull()
  })

  it('never gives a worker another person’s workload', () => {
    const rows = [{ user_id: 'colleague', pending_count: 8, in_progress_count: 2 }]
    expect(visibleWorkload(false, 'colleague', rows)).toBeNull()
    expect(visibleWorkload(true, 'colleague', rows)?.pending_count).toBe(8)
  })
})
