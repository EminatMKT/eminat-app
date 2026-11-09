import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import en from '@/shared/i18n/locales/en.json'
import NativeSalesDashboard, { type SalesSummary } from './NativeSalesDashboard'
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: keyof typeof en) => en[key] }) }))

const summary: SalesSummary = {
  asOf: '2026-10-25', scope: 'organization',
  leads: { total: 8, byStatus: [{ code: 'NEW', count: 4 }, { code: 'ASSIGNED', count: 3 }, { code: 'CONVERTED', count: 1 }] },
  opportunities: { total: 11, open: 6, won: 1, lost: 4, openByCurrency: [],
    byStage: [{ code: 'PAYMENT_PENDING', label: 'Payment pending', count: 6, outcome: 'OPEN' },
      { code: 'WON', label: 'Won', count: 1, outcome: 'WON' }, { code: 'LOST', label: 'Lost', count: 4, outcome: 'LOST' }] },
}
describe('Sales dashboard presentation integrity', () => {
  it('exposes the exact authorized summary values in accessible chart tables without changing the input', () => {
    const before = JSON.stringify(summary)
    const html = renderToStaticMarkup(<NativeSalesDashboard summary={summary} />)
    expect(html).toContain('<th scope="row">New</th><td>4</td>') // i18n-ignore: serialized markup assertion, not user-facing copy
    expect(html).toContain('<th scope="row">Assigned</th><td>3</td>') // i18n-ignore: serialized markup assertion, not user-facing copy
    expect(html).toContain('<th scope="row">Payment pending</th><td>6</td>') // i18n-ignore: serialized markup assertion, not user-facing copy
    expect(html).toContain('<th scope="row">Won</th><td>1</td>') // i18n-ignore: serialized markup assertion, not user-facing copy
    expect(html).toContain('Organization scope')
    expect(html).not.toContain('Conversion trend')
    expect(JSON.stringify(summary)).toBe(before)
  })
  it('shows honest empty states for empty permitted data', () => {
    const empty: SalesSummary = { asOf: '2026-10-25', scope: 'permitted', leads: { total: 0, byStatus: [] },
      opportunities: { total: 0, open: 0, won: 0, lost: 0, byStage: [], openByCurrency: [] } }
    const html = renderToStaticMarkup(<NativeSalesDashboard summary={empty} />)
    expect(html.match(/No permitted records to display yet\./g)).toHaveLength(3)
    expect(html).toContain('Your permitted records')
    expect(html).not.toContain('NaN')
  })
})
