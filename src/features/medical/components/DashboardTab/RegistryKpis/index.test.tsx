import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RegistryKpis from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const BASE = {
  counts: null,
  loading: false,
  error: null,
}

describe('RegistryKpis', () => {
  it('shows a dash for registry stats while nothing has loaded yet', () => {
    const html = renderToStaticMarkup(<RegistryKpis {...BASE} loading />)
    expect(html).toContain('—')
  })

  it('renders the real registry numbers once counts resolve', () => {
    const counts = { totalPatients: 500, withEmail: 300, withoutEmail: 200 }
    const html = renderToStaticMarkup(<RegistryKpis {...BASE} counts={counts} />)
    expect(html).toContain('500')
    expect(html).toContain('300')
  })

  it('surfaces a failure message instead of staying silent', () => {
    const html = renderToStaticMarkup(<RegistryKpis {...BASE} error={new Error('boom')} />)
    expect(html).toContain('med.dashboardLoadError')
  })
})
