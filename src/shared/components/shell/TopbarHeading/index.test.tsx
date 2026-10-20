import { beforeEach, describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TopbarHeading from './index'

const PAGE_TITLE = 'Page title'
const blank = vi.hoisted(() => () => null)
const clockFixture = vi.hoisted(() => 'World clocks fixture')
const app = vi.hoisted(() => ({
  usuario: { nombre: 'Freddy Crespín', empresa_id: 'eminat' } as { nombre: string; empresa_id: string | null },
  empresas: [
    { id: 'eminat', nombre: 'Eminat Group' },
    { id: 'stratix', nombre: 'Stratix Communications' },
    { id: 'erg', nombre: 'Eminat Research Group' },
  ],
}))

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => app }))
vi.mock('@/shared/components/shell/WorldClocks', () => ({ default: () => <span>{clockFixture}</span> }))
vi.mock('@/shared/components/shell/TopbarDate', () => ({ default: blank }))

describe('TopbarHeading', () => {
  beforeEach(() => { app.usuario = { nombre: 'Freddy Crespín', empresa_id: 'eminat' } })

  it('keeps the system branding fixed and uses the assigned company and first name', () => {
    const markup = renderToStaticMarkup(<TopbarHeading title={PAGE_TITLE} />)
    expect(markup).toContain('LILLY')
    expect(markup).toContain('Powered by Stratix Communications.')
    expect(markup).toContain('Eminat Group — Welcome, Freddy')
    expect(markup).toContain(`title="${PAGE_TITLE}"`)
  })

  it('reads Stratix and ERG from the company catalog', () => {
    app.usuario = { nombre: 'Ariana Sig-Tú', empresa_id: 'stratix' }
    expect(renderToStaticMarkup(<TopbarHeading />)).toContain('Stratix Communications — Welcome, Ariana')
    app.usuario = { nombre: 'Diana Hernandez', empresa_id: 'erg' }
    expect(renderToStaticMarkup(<TopbarHeading />)).toContain('Eminat Research Group — Welcome, Diana')
  })

  it('uses a neutral fallback when the user has no company', () => {
    app.usuario = { nombre: 'Jean Frank', empresa_id: null }
    const markup = renderToStaticMarkup(<TopbarHeading />)
    expect(markup).toContain('Organization — Welcome, Jean')
    expect(markup).toContain('World clocks fixture')
  })
})
