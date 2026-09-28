import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingRecordsTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const payment = fixtureRecord({ id: 'r1' })

describe('BillingRecordsTab', () => {
  it('mounts the calendar and the reminders over the same records', () => {
    const html = renderToStaticMarkup(
      <BillingRecordsTab records={[payment]} today="2026-09-23" onOpen={vi.fn()} onNewOn={vi.fn()} />,
    )
    expect(html).toContain('September 2026')
    expect(html).toContain('billing.reminders.upcoming')
    expect(html.split(payment.title ?? '').length - 1).toBe(2)
  })
})
