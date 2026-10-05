import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActividadResponsable } from '@/features/tasks/types'
import type { MultiCombobox } from '@/shared/components/ui'
import ResponsiblesPicker from './index'

type Captured = Partial<ComponentProps<typeof MultiCombobox>>
const { combo } = vi.hoisted(() => {
  const props: Captured = {}
  return { combo: { props } }
})
vi.mock('@/shared/components/ui', async original => ({
  ...(await original<object>()),
  MultiCombobox: (props: Captured) => { combo.props = props; return null },
}))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: object) => [key, ...Object.values(vars ?? {})].join(':') }),
}))

const members = [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }]
const leaderAna: ActividadResponsable[] = [{ usuario_id: 'a', es_lider: true }]
const changes: ActividadResponsable[][] = []
const record = (rows: ActividadResponsable[]) => { changes.push(rows) }
const draw = (rows: ActividadResponsable[], roster = members) =>
  renderToStaticMarkup(<ResponsiblesPicker members={roster} rows={rows} onChange={record} />)
const markup = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)

describe('ResponsiblesPicker', () => {
  beforeEach(() => { combo.props = {}; changes.length = 0 })

  it('the closed box reads the placeholder while nobody is in', () => {
    draw([])
    expect(combo.props.display).toBe('stratix.new.select')
  })

  it('the closed box reads crown, leader and count, like the card', () => {
    draw([...leaderAna, { usuario_id: 'b', es_lider: false }])
    expect(combo.props.display).toBe('👑 Ana +1')
    expect(combo.props.selected).toEqual(['a', 'b'])
  })

  it('checking a person adds them, unchecking takes them out', () => {
    draw(leaderAna)
    combo.props.onToggle?.('b')
    combo.props.onToggle?.('a')
    expect(changes).toEqual([[...leaderAna, { usuario_id: 'b', es_lider: false }], []])
  })

  it('only a chosen person gets the crown, and it toggles the leader', () => {
    draw([{ usuario_id: 'a', es_lider: false }])
    expect(combo.props.action?.({ id: 'b', label: 'Beto' })).toBeFalsy()
    expect(markup(combo.props.action?.({ id: 'a', label: 'Ana' }))).toContain('tasks.responsibles.makeLeaderAria:Ana')
  })

  it('an empty roster and a search with no match are two messages', () => {
    draw([], [])
    expect(markup(combo.props.empty?.({ query: '', clear: vi.fn() }))).toContain('tasks.responsibles.emptyRoster')
    draw([])
    const noMatch = markup(combo.props.empty?.({ query: 'zz', clear: vi.fn() }))
    expect(noMatch).toContain('tasks.responsibles.noResults:zz')
    expect(noMatch).toContain('tasks.responsibles.clearSearch')
  })
})
