import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingV2Content from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
vi.mock('@/shared/hooks', () => ({ useTabPreference: (_module: string, initial: unknown) => [initial, vi.fn()] }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ t1: '#000', t3: '#999', accent: '#000' }) }))

const payment = fixtureRecord({ id: 'r1' })
const api = { records: [payment], loading: false, error: null, reload: vi.fn(), save: vi.fn(), remove: vi.fn() }
vi.mock('@/features/billing-v2/hooks/useBillingV2Records', () => ({ default: () => api }))
vi.mock('@/features/billing-v2/hooks/useBusinessToday', () => ({ default: () => '2026-09-23' }))

describe('BillingV2Content', () => {
  // One name for one screen: the heading is the module's own name, the one the rail shows.
  it('names the screen after its module and offers a new record', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain(`>${MODULE_META[MODULE.COBRANZAS].name}</h2>`)
    expect(html).toContain('billing.new')
  })

  // The default tab is the records tab, which draws the calendar and reminders.
  it('mounts its records tab by default', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain('September 2026')
  })

  // The live region for «saved» / «deleted» is in place before a write lands, so it is announced.
  it('keeps a live region ready for the confirmation of a write', () => {
    expect(renderToStaticMarkup(<BillingV2Content />)).toContain('aria-live="polite"')
  })

  // The editor only mounts when somebody opens a record or asks for a new one.
  it('keeps the editor closed until it is asked for', () => {
    expect(renderToStaticMarkup(<BillingV2Content />)).not.toContain('billing.editorNew')
  })

  // Both tabs are always offered, whichever one is currently drawn.
  it('offers both tabs', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain('billing.tab.records')
    expect(html).toContain('billing.tab.overview')
  })
})
