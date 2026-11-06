import { expect, it } from 'vitest'
import { overviewModel } from './overview-model'

it('preserves multiple meeting associations, distinct counts, ordered tasks, null status and status exclusions', () => {
  const summary = {
    tasks: ['a', 'b', 'status'].map(id => ({ id, titulo: id, estado: 'Pendiente', responsable: { id: 'user', nombre: 'Canonical leader' } })),
    links: [
      { topic_id: '1', meeting_id: 'm1', actividad_id: 'b', section: 'action' },
      { topic_id: '2', meeting_id: 'm1', actividad_id: 'a', section: 'action' },
      { topic_id: '3', meeting_id: 'm1', actividad_id: 'a', section: 'action' },
      { topic_id: '4', meeting_id: 'm2', actividad_id: 'a', section: 'action' },
      { topic_id: '5', meeting_id: 'm1', actividad_id: 'status', section: 'meeting_activity' },
      { topic_id: '6', meeting_id: 'm1', actividad_id: 'status', section: 'action' },
      { topic_id: '7', meeting_id: 'm2', actividad_id: null, section: 'meeting_activity' },
    ],
    header: { team: null, department: null, company: null },
  }
  const result = overviewModel(summary)
  expect(result.byMeeting.m1.map(task => task.id)).toEqual(['a', 'b'])
  expect(result.byMeeting.m2.map(task => task.id)).toEqual(['a'])
  expect(result.byMeeting.m1[0].responsable).toBe('Canonical leader')
  expect(result.statusByMeeting.m1?.id).toBe('status')
  expect(result.statusByMeeting.m2).toBeNull()
})
