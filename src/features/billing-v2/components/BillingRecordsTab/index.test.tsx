import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingRecordsTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const paymentFixture = { id: 'r1' }
const payment = fixtureRecord(paymentFixture)

describe('BillingRecordsTab', () => {
  it('mounts the calendar and the reminders over the same records', () => {
    const html = renderToStaticMarkup(
      <BillingRecordsTab records={[payment]} today="2026-09-23" onOpen={vi.fn()} period="2026-09-01" onPeriodChange={vi.fn()} onNewOn={vi.fn()} />,
    )
    expect(html).toContain('September 2026')
    expect(html).toContain('billing.reminders.upcoming')
    const paymentTitle = payment.title ? payment.title : ''
    expect(html.split(paymentTitle).length - 1).toBe(2)
  })
})
