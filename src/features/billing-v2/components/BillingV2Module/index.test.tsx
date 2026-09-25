import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BillingV2Module from './index'

/** What the stand-ins below are handed: a shell's children, or the denial's message. */
type Stand = { children?: string; message?: string }

const app = { modules: [] as string[], loading: false }
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => app }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/components/shell', () => ({ AppShell: ({ children }: Stand) => children }))
vi.mock('@/shared/motion', () => ({ PageTransition: ({ children }: Stand) => children }))
vi.mock('@/shared/components/access', () => ({ AccessDenied: ({ message }: Stand) => `DENIED ${message}` }))
vi.mock('@/features/billing-v2/components/BillingV2Content', () => ({ default: () => 'LOADER MOUNTED' }))

describe('BillingV2Module', () => {
  beforeEach(() => { app.modules = []; app.loading = false })

  // No module, no loader: the records hook lives in the content and never runs for them.
  it('turns away whoever lacks the cobranzas module without mounting the loader', () => {
    const html = renderToStaticMarkup(<BillingV2Module />)
    expect(html).toContain('DENIED billing.noAccess')
    expect(html).not.toContain('LOADER MOUNTED')
  })

  it('mounts the screen for whoever holds the module', () => {
    app.modules = ['cobranzas']
    expect(renderToStaticMarkup(<BillingV2Module />)).toContain('LOADER MOUNTED')
  })

  // While the session is still loading nobody is denied, and nothing is read either.
  it('waits for the session before deciding', () => {
    app.loading = true
    const html = renderToStaticMarkup(<BillingV2Module />)
    expect(html).not.toContain('DENIED')
    expect(html).not.toContain('LOADER MOUNTED')
  })
})
