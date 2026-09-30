import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingV2Content from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
const appColors = { t1: '#000', t3: '#999', accent: '#000' }
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => appColors }))

const paymentFixture = { id: 'r1' }
const payment = fixtureRecord(paymentFixture)
const api = {
  records: [payment],
  loading: false,
  error: null,
  reload: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}
vi.mock('@/features/billing-v2/hooks/useBillingV2Records', () => ({ default: () => api }))
vi.mock('@/features/billing-v2/hooks/useBusinessToday', () => ({ default: () => '2026-09-23' }))

describe('BillingV2Content', () => {
  // The records tab draws the calendar and reminders, and offers a new record.
  it('mounts the records tab it is handed and offers a new record', () => {
    const html = renderToStaticMarkup(<BillingV2Content tab="records" />)
    expect(html).toContain('September 2026')
    expect(html).toContain('billing.new')
  })

  // Overview has nothing to create: New record only belongs to the tab that lists them.
  it('mounts the overview tab it is handed, without a new-record button', () => {
    const html = renderToStaticMarkup(<BillingV2Content tab="overview" />)
    expect(html).toContain('billing.summary.paidByCategory')
    expect(html).not.toContain('billing.new')
  })

  // The live region for «saved» / «deleted» is in place before a write lands, so it is announced.
  it('keeps a live region ready for the confirmation of a write', () => {
    expect(renderToStaticMarkup(<BillingV2Content tab="records" />)).toContain('aria-live="polite"')
  })

  // The editor only mounts when somebody opens a record or asks for a new one.
  it('keeps the editor closed until it is asked for', () => {
    expect(renderToStaticMarkup(<BillingV2Content tab="records" />)).not.toContain('billing.editorNew')
  })
})
