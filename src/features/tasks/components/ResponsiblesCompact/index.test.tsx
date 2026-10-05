import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ResponsiblesCompact from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// The i18n mock answers with the key itself, so the crown is named by its key.
const LEADER_KEY = 'tasks.responsibles.leaderBadge'
const LEADER_BADGE = `aria-label="${LEADER_KEY}"`

const names = { u1: 'Ana Bravo', u2: 'Beto Medico', u3: 'Carla Diaz' }
const member = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })
const draw = (rows: ReturnType<typeof member>[]) =>
  renderToStaticMarkup(<ResponsiblesCompact a={{ responsables: rows }} namesById={names} />)

describe('ResponsiblesCompact', () => {
  it('draws the crown before the leader and counts the rest', () => {
    const html = draw([member('u1'), member('u3', true), member('u2')])
    expect(html).toContain(LEADER_BADGE)
    expect(html).toContain('Carla Diaz +2')
  })

  it('without a leader draws no crown and picks the first name alphabetically', () => {
    const html = draw([member('u3'), member('u1')])
    expect(html).not.toContain('<svg')
    expect(html).toContain('Ana Bravo +1')
  })

  it('with nobody responsible draws —', () => {
    expect(draw([])).toContain('—')
  })
})
