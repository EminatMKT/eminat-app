import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActividadResponsable } from '@/features/tasks/types'
import type { ChecklistChoice } from '@/shared/components/ui'
import ResponsablesChecklist from './index'

// Each row is replaced by a recorder: the test reads what every row was drawn with and fires
// its callbacks without a DOM.
const { choices } = vi.hoisted(() => ({ choices: new Array<ComponentProps<typeof ChecklistChoice>>() }))
vi.mock('@/shared/components/ui', async original => ({
  ...(await original<object>()),
  ChecklistChoice: (props: ComponentProps<typeof ChecklistChoice>) => { choices.push(props); return null },
}))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: object) => [key, ...Object.values(vars ?? {})].join(':') }),
}))

// The i18n mock answers with the key itself, so the search box and the list are named by their keys.
const SEARCH_KEY = 'tasks.responsibles.searchPh'
const LIST_KEY = 'tasks.responsibles.label'
const SEARCH_BOX = `placeholder="${SEARCH_KEY}"`
const LIST_NAME = `aria-label="${LIST_KEY}"`
const members = [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }]
const leaderAna: ActividadResponsable[] = [{ usuario_id: 'a', es_lider: true }]
const changes: ActividadResponsable[][] = []
const onChange = (rows: ActividadResponsable[]) => { changes.push(rows) }
const draw = (rows: ActividadResponsable[]) =>
  renderToStaticMarkup(<ResponsablesChecklist members={members} rows={rows} onChange={onChange} />)

describe('ResponsablesChecklist', () => {
  beforeEach(() => { choices.length = 0; changes.length = 0 })

  it('draws one row per assignable member, checked only when responsible', () => {
    draw(leaderAna)
    const checked = choices.map(c => [c.label, c.checked])
    expect(checked).toEqual([['Ana', true], ['Beto', false]])
  })

  it('marks the leader crown as pressed and names the person in its label', () => {
    draw(leaderAna)
    const pressed = choices.map(c => c.actionPressed)
    expect(pressed).toEqual([true, false])
    expect(choices[0].actionLabel).toBe('tasks.responsibles.leaderToggleAria:Ana')
  })

  it('checking a member adds them without leadership', () => {
    draw(leaderAna)
    choices[1].onChecked(true)
    const expected = [...leaderAna, { usuario_id: 'b', es_lider: false }]
    expect(changes).toEqual([expected])
  })

  it('the crown makes that member the only leader', () => {
    const both = [{ usuario_id: 'a', es_lider: true }, { usuario_id: 'b', es_lider: false }]
    draw(both)
    choices[1].onAction?.()
    const expected = [{ usuario_id: 'a', es_lider: false }, { usuario_id: 'b', es_lider: true }]
    expect(changes).toEqual([expected])
  })

  it('renders a search box and a labelled list', () => {
    const html = draw([])
    expect(html).toContain(SEARCH_BOX)
    expect(html).toContain(LIST_NAME)
  })
})
