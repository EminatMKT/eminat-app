import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingV2Content from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const payment = fixtureRecord({ id: 'r1' })
const api = { records: [payment], loading: false, error: null, reload: vi.fn(), save: vi.fn(), remove: vi.fn() }
vi.mock('@/features/billing-v2/hooks/useBillingV2Records', () => ({ default: () => api }))
vi.mock('@/features/billing-v2/hooks/useBusinessToday', () => ({ default: () => '2026-09-23' }))

describe('BillingV2Content', () => {
  it('names the screen and offers a new record', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain('billing.title')
    expect(html).toContain('billing.new')
  })

  // One copy of the records feeds both views: the unpaid payment is on its day and in Upcoming,
  // each drawn once on screen and once in its spoken label.
  it('mounts the calendar and the reminders over the shared records', () => {
    const html = renderToStaticMarkup(<BillingV2Content />)
    expect(html).toContain('billing.calendar.emptyDay')
    expect(html).toContain('billing.reminders.upcoming')
    expect(html.split(payment.title ?? '').length - 1).toBe(4)
  })

  // The editor only mounts when somebody opens a record or asks for a new one.
  it('keeps the editor closed until it is asked for', () => {
    expect(renderToStaticMarkup(<BillingV2Content />)).not.toContain('billing.editorNew')
  })
})
