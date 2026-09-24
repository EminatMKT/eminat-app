import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import BillingV2Content from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const payment = { id: 'r1', record_type: 'payment', title: 'Nómina', scheduled_on: '2026-09-30', note_month: null } as BillingV2Record
const api = { records: [payment], loading: false, error: null, reload: vi.fn(), save: vi.fn(), remove: vi.fn() }
vi.mock('@/features/billing-v2/hooks/useBillingV2Records', () => ({ default: () => api }))

describe('BillingV2Content', () => {
  it('names the screen and offers a new record', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain('billing.title')
    expect(html).toContain('billing.new')
  })

  it('shows the stored records from the shared hook', () => {
    expect(renderToStaticMarkup(<BillingV2Content />)).toContain('Nómina')
  })

  // The editor only mounts when somebody opens a record or asks for a new one.
  it('keeps the editor closed until it is asked for', () => {
    expect(renderToStaticMarkup(<BillingV2Content />)).not.toContain('billing.editorNew')
  })
})
