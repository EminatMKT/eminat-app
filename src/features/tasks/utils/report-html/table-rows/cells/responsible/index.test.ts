import { describe, expect, it } from 'vitest'
import type { Actividad } from '@/features/tasks/types'
import responsibleCell from './index'

const NO_RESPONSABLES_TASK: Actividad = { titulo: 'Task' }
const NO_NAMES: Record<string, string> = {}
const MISSING_ASSIGNEE = '—'
const LEADER_ID = 'u1'
const LEADER_TASK: Actividad = { responsables: [{ usuario_id: LEADER_ID, es_lider: true }] }
const HOSTILE_NAME = 'Jane <X>'
const ESCAPED_HOSTILE_NAME = 'Jane &lt;X&gt;'
const NAMES_WITH_HOSTILE_ENTRY: Record<string, string> = { [LEADER_ID]: HOSTILE_NAME }

describe('responsibleCell', () => {
  it('falls back to a dash when no responsible resolves', () => {
    expect(responsibleCell(NO_RESPONSABLES_TASK, NO_NAMES)).toContain(MISSING_ASSIGNEE)
  })

  it('escapes a resolved responsible name', () => {
    const html = responsibleCell(LEADER_TASK, NAMES_WITH_HOSTILE_ENTRY)

    expect(html).toContain(ESCAPED_HOSTILE_NAME)
    expect(html).not.toContain(HOSTILE_NAME)
  })
})
