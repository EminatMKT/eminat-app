import { describe, expect, it } from 'vitest'
import type { Actividad } from '@/features/tasks/types'
import buildTableRows from './index'

const ESCAPED_TITLE = '&lt;script&gt;'
const EMPTY_TASKS: Actividad[] = []
const NAMES: Record<string, string> = {}
const ESCAPED_DESCRIPTION = 'A &amp; B'
const ESCAPED_COMPANY = 'E&lt;MC'
const START_DATE = '2026-08-01'
const END_DATE = '2026-08-02'
const STATUS = 'Pendiente'
const TASKS: Actividad[] = [{
  titulo: '<script>', descripcion: 'A & B', empresa: 'E<MC',
  fecha_inicio: START_DATE, fecha_entrega: END_DATE, estado: STATUS,
}]
const EMPTY_HTML = ''
const FALLBACK_DATE = '—'
const TASK: Actividad[] = [{ titulo: 'Task' }]

describe('buildTableRows', () => {
  it('escapes task text and renders dates and status', () => {
    const html = buildTableRows(TASKS, NAMES)
    expect(html).toContain(ESCAPED_TITLE)
    expect(html).toContain(ESCAPED_DESCRIPTION)
    expect(html).toContain(ESCAPED_COMPANY)
    expect(html).toContain(START_DATE)
    expect(html).toContain(END_DATE)
    expect(html).toContain(STATUS)
  })

  it('returns no rows for an empty list', () => {
    expect(buildTableRows(EMPTY_TASKS, NAMES)).toBe(EMPTY_HTML)
  })

  it('uses the dash for absent task dates', () => {
    const task = TASK
    expect(buildTableRows(task, NAMES)).toContain(FALLBACK_DATE)
  })
})
