import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useBillingFilters from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (k: string) => k }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

let captured: ReturnType<typeof useBillingFilters> | undefined
function Probe() {
  captured = useBillingFilters()
  return null
}

describe('useBillingFilters', () => {
  it('wires the module\'s own three filters, opening on the date range', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.defs.map(d => d.key)).toEqual(['scheduled_on', 'category', 'payment_status'])
    expect(captured?.visibles.map(d => d.key)).toEqual(['scheduled_on'])
  })
})
