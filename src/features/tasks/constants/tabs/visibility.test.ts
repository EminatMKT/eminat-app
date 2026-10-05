import { expect, it } from 'vitest'
import { TASKS_TAB, visibleTasksTabs } from './index'
it('hides Dashboard for workers while keeping Production, Requests and Report', () => {
  expect(visibleTasksTabs(false)).toEqual([TASKS_TAB.KANBAN, TASKS_TAB.SOLICITUDES, TASKS_TAB.PROJECTS, TASKS_TAB.TEAM, TASKS_TAB.REPORTE])
})
it('keeps all four Tasks views for the existing admin role', () => {
  expect(visibleTasksTabs(true)).toContain(TASKS_TAB.OVERVIEW)
})
