import { describe, expect, it } from 'vitest'
import type { Actividad } from '@/features/tasks/types'
import titleCell from './index'

const TASK: Actividad = { titulo: '<Task>', descripcion: 'P & Q' }
const NO_DESCRIPTION: Actividad = { titulo: 'No description' }
const ESCAPED_TITLE = '&lt;Task&gt;'
const ESCAPED_DESCRIPTION = 'P &amp; Q'
const DESC_STYLE = 'white-space:pre-wrap'
const DESC_WRAPPER_PATTERN = new RegExp(`<div style="[^"]*${DESC_STYLE}[^"]*">${ESCAPED_DESCRIPTION}</div>`)

describe('titleCell', () => {
  it('escapes the title', () => {
    expect(titleCell(TASK)).toContain(ESCAPED_TITLE)
  })

  it('escapes a present description and wraps it in its own styled div', () => {
    expect(titleCell(TASK)).toMatch(DESC_WRAPPER_PATTERN)
  })

  it('omits the description wrapper entirely when the description is absent', () => {
    expect(titleCell(NO_DESCRIPTION)).not.toContain(DESC_STYLE)
  })
})
