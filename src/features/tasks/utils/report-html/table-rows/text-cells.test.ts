import { describe, expect, it } from 'vitest'
import { companyCell, responsibleCell, titleCell } from './text-cells'
import type { Actividad } from '@/features/tasks/types'

const TASK: Actividad = { titulo: '<Task>', descripcion: 'A & B', empresa: 'E<MC' }
const NAMES: Record<string, string> = {}
const NO_DESCRIPTION: Actividad = { titulo: 'No description' }
const ESCAPED_TITLE = '&lt;Task&gt;'
const ESCAPED_DESCRIPTION = 'A &amp; B'
const ESCAPED_COMPANY = 'E&lt;MC'
const DESC_STYLE = 'white-space:pre-wrap'
const MISSING_ASSIGNEE = '—'

describe('task text cells', () => {
  it('escapes title, description, and company fields', () => {
    const title = titleCell(TASK)
    expect(title).toContain(ESCAPED_TITLE)
    expect(title).toContain(ESCAPED_DESCRIPTION)
    expect(companyCell(TASK)).toContain(ESCAPED_COMPANY)
  })

  it('omits an absent description and handles unresolved assignees', () => {
    expect(titleCell(NO_DESCRIPTION)).not.toContain(DESC_STYLE)
    expect(responsibleCell(TASK, NAMES)).toContain(MISSING_ASSIGNEE)
  })
})
