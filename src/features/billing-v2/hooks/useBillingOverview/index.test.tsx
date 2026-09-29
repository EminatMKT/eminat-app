import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import useBillingOverview from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (k: string) => k }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const { paid: PAID, pending: PENDING } = billingRecordValues.paymentStatus.enum
const records = [
  fixtureRecord({ id: '1', category: 'payroll', payment_status: PAID }),
  fixtureRecord({ id: '2', category: 'contractors_vendors', payment_status: PENDING }),
]

let captured: ReturnType<typeof useBillingOverview> | undefined
function Probe() {
  captured = useBillingOverview(records)
  return null
}

describe('useBillingOverview', () => {
  it('tallies every payment when nothing is filtered', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.overview.byCategory).toEqual({ payroll: 1, contractors_vendors: 1 })
  })

  it('labels each status through i18n for the chart', () => {
    renderToStaticMarkup(<Probe />)
    const paid = captured?.statusData.find(d => d.key === PAID)
    expect(paid?.name).toBe('billing.status.paid')
  })

  it('hands back the exact filter keys the charts click through', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.CATEGORY_KEY).toBe('category')
    expect(captured?.STATUS_KEY).toBe('payment_status')
  })
})
