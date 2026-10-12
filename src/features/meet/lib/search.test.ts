import { describe, expect, it } from 'vitest'
import { matchesMeetingSearch, matchesTaskSearch } from './search'
import { visibleMeetTasks, type TaskScope } from './meeting-view'
import type { CanonicalTaskListItem } from './types'

const tasks: CanonicalTaskListItem[] = Array.from({ length: 48 }, (_, index) => ({
  id: `synthetic-${index}`, titulo: index < 6 ? 'Reunión: Meeting Semanal' : 'Documentos Septiembre',
  descripcion: 'Seguimiento clínico', estado: index < 43 ? 'Pendiente' : index < 45 ? 'En proceso' : index < 47 ? 'Por aprobar' : 'Completado',
  responsable_id: index < 11 ? 'qa' : 'other', responsable: { id: index < 11 ? 'qa' : 'other', nombre: 'Responsable QA' },
  empresa: 'QA', equipo: { id: 'team', codigo: 'T', nombre: 'Equipo QA' }, departamento: { id: 'dept', codigo: 'D', nombre: 'Departamento QA' },
  meeting: index < 6 ? null : { id: 'meeting', title: 'Reunión de origen', company: 'Empresa QA' }, topic_id: index < 6 ? null : 'topic', related_to_viewer: true,
  fecha_inicio: '2026-10-01', fecha_entrega: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
}))
const viewer = { profileId: 'qa', teamId: 'team', company: 'QA' }

describe('Meetings presentation-only search', () => {
  it.each(['related', 'all', 'mine', 'team', 'company'] as TaskScope[])('composes with %s scope and status without mutating rows', (scope) => {
    const before = JSON.stringify(tasks)
    const scoped = visibleMeetTasks(tasks, scope, viewer, '', 'Pendiente')
    expect(scoped.filter((task) => matchesTaskSearch(task, 'responsable QA'))).toEqual(scoped)
    expect(scoped.filter((task) => matchesTaskSearch(task, 'no-match'))).toHaveLength(0)
    expect(JSON.stringify(tasks)).toBe(before)
  })
  it('searches title, assignee, company and source meeting, ignoring accents/case', () => {
    for (const query of ['DOCUMENTOS septiembre', 'responsable qa', 'empresa qa', 'reunion origen']) {
      expect(matchesTaskSearch(tasks[6], query)).toBe(true)
    }
    expect(matchesMeetingSearch('clinico seguimiento', ['Seguimiento clínico'])).toBe(true)
  })
  it('clearing search restores all 48 IDs and their status distribution, including six without Topic', () => {
    const visible = visibleMeetTasks(tasks, 'related', viewer, '').filter((task) => matchesTaskSearch(task, '  '))
    expect(visible.map((task) => task.id)).toEqual(tasks.map((task) => task.id))
    expect(visible.filter((task) => task.topic_id === null)).toHaveLength(6)
    expect(Object.fromEntries(['Pendiente', 'En proceso', 'Por aprobar', 'Completado'].map((status) => [status, visible.filter((task) => task.estado === status).length]))).toEqual({ Pendiente: 43, 'En proceso': 2, 'Por aprobar': 2, Completado: 1 })
    expect(visible.filter((task) => matchesTaskSearch(task, 'meeting semanal'))).toHaveLength(6)
  })
  it('keeps the existing assignee filter and handles missing optional values', () => {
    expect(visibleMeetTasks(tasks, 'all', viewer, 'other').filter((task) => matchesTaskSearch(task, 'QA'))).toHaveLength(37)
    expect(matchesMeetingSearch('abc', [null, undefined])).toBe(false)
    expect(matchesMeetingSearch('', [null])).toBe(true)
  })
})
