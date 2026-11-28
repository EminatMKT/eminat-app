import { describe, expect, it } from 'vitest'
import { dateCells, statusCell } from './cells'
import { titleCell } from './text-cells'
import type { Actividad } from '@/features/tasks/types'

const ACTIVITY: Actividad = {
  titulo: '<Task>', descripcion: 'A & B', fecha_inicio: '2026-08-01',
}
const EXPECTED_TITLE = '&lt;Task&gt;'
const NO_DESCRIPTION: Actividad = { titulo: 'No description' }
const DESC_STYLE = 'white-space:pre-wrap'
const FALLBACK_DATE = '—'
const UNKNOWN_COLOR = '#999'
const ESCAPED_DESCRIPTION = 'A &amp; B'

describe('task row cells', () => {
  it('escapes the title and description and omits absent descriptions', () => {
    const html = titleCell(ACTIVITY)
    expect(html).toContain(EXPECTED_TITLE)
    expect(html).toContain(ESCAPED_DESCRIPTION)
    expect(titleCell(NO_DESCRIPTION)).not.toContain(DESC_STYLE)
  })

  it('falls back to a dash for missing dates and colors unknown statuses safely', () => {
    expect(dateCells({})).toContain(FALLBACK_DATE)
    expect(statusCell(undefined)).toContain(UNKNOWN_COLOR)
  })
})
