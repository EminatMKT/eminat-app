import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PieChartCard, BarChartCard } from '@/shared/components/dashboard'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingOverviewTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
vi.mock('@/shared/hooks', () => ({ useUserPreference: (_key: string | null, initial: unknown) => [initial, vi.fn()] }))

const { pieCard, barCard } = vi.hoisted(() => ({
  pieCard: vi.fn((_props: Parameters<typeof PieChartCard>[0]) => null),
  barCard: vi.fn((_props: Parameters<typeof BarChartCard>[0]) => null),
}))
vi.mock('@/shared/components/dashboard/PieChartCard', () => ({ default: pieCard }))
vi.mock('@/shared/components/dashboard/BarChartCard', () => ({ default: barCard }))

const PAID_KEY = 'billing.status.paid'

describe('BillingOverviewTab', () => {
  beforeEach(() => {
    pieCard.mockClear()
    barCard.mockClear()
  })

  it('shows the selected month, the known subtotal and the unknown count', () => {
    const records = [
      fixtureRecord({ id: '1', scheduled_on: '2026-09-05', amount: '100.00' }),
      fixtureRecord({ id: '2', scheduled_on: '2026-09-10', amount: null }),
    ]
    const html = renderToStaticMarkup(<BillingOverviewTab records={records} today="2026-09-23" />)
    expect(html).toContain('September 2026')
    expect(html).toContain('$100.00')
    expect(html).toContain('>1<')
  })

  it('feeds the category and status charts with every catalog member, zeros included', () => {
    const records = [fixtureRecord({ id: '1', scheduled_on: '2026-09-05', category: 'payroll', payment_status: 'paid', amount: '5.00' })]
    renderToStaticMarkup(<BillingOverviewTab records={records} today="2026-09-15" />)
    const categoryCall = pieCard.mock.calls[0]?.[0]
    const statusCall = barCard.mock.calls[0]?.[0]
    expect(categoryCall?.data).toEqual([
      { name: 'billing.category.payroll', value: 1 },
      { name: 'billing.category.contractorsVendors', value: 0 },
    ])
    expect(statusCall?.data.find((d) => d.name === PAID_KEY)?.value).toBe(1)
  })
})
