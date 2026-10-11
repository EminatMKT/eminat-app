import { describe, expect, it } from 'vitest'
import { splitMeetingHistory, visibleMeetTasks } from './meeting-view'
import { loadMeetingListAndTasks } from './services/meeting-list-load'
import type { CanonicalTaskListItem } from './types'

describe('Meet inside LILLY: synthetic Diana equivalent', () => {
  const meetings = Array.from({ length: 9 }, (_, index) => ({
    id: `meeting-${index + 1}`,
    user_id: index < 8 ? 'qa-auth' : 'other-auth',
    status: index === 0 || index === 8 ? 'finalizada' as const : 'activa' as const,
    company_id: index === 8 ? 'other-company' : 'qa-company',
  }))
  const tasks = Array.from({ length: 47 }, (_, index) => ({
    id: `activity-${index + 1}`,
    responsable_id: index < 11 ? 'qa-profile' : 'other-profile',
    empresa: index === 46 ? 'OTHER' : 'QA',
    equipo: null,
    meeting: { id: meetings[index % 9].id, title: `Meeting ${index % 9}` },
  })) as CanonicalTaskListItem[]

  it('shows all nine RLS-authorized rows, including a cross-company participant and history', async () => {
    const result = await loadMeetingListAndTasks(
      Promise.resolve({ data: meetings, error: null }),
      Promise.resolve({ tasks }),
    )
    const displayed = splitMeetingHistory(result.meetings)
    expect(result.meetings).toHaveLength(9)
    expect(displayed.active.length + displayed.finished.length).toBe(9)
    expect(displayed.finished).toHaveLength(2)
    expect(displayed.finished.some((meeting) => meeting.company_id === 'other-company')).toBe(true)
  })

  it('shows all 47 API-authorized activities by default, including 11 directly assigned', () => {
    expect(visibleMeetTasks(tasks, 'all', { profileId: 'qa-profile', teamId: null, company: 'QA' }, '')).toHaveLength(47)
    expect(visibleMeetTasks(tasks, 'mine', { profileId: 'qa-profile', teamId: null, company: 'QA' }, '')).toHaveLength(11)
  })

  it('keeps meetings visible and surfaces the Task API error', async () => {
    const result = await loadMeetingListAndTasks(
      Promise.resolve({ data: meetings, error: null }),
      Promise.reject(new Error('Tasks API unavailable')),
    )
    expect(result.meetings).toHaveLength(9)
    expect(result.taskError).toBe('Tasks API unavailable')
  })

  it('does not interpret an API error as an empty meeting history', async () => {
    const result = await loadMeetingListAndTasks(
      Promise.resolve({ data: null, error: { message: 'Meetings access denied' } }),
      Promise.resolve({ tasks }),
    )
    expect(result.meetingError).toBe('Meetings access denied')
  })
})
