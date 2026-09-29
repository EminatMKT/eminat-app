import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useBillingFilters from './index'

const mocks = vi.hoisted(() => {
  const i18nMock = { useT: () => ({ t: (k: string) => k }) }
  const appContextMock = { useApp: () => ({ usuario: null }) }
  return { i18nMock, appContextMock }
})

vi.mock('@/shared/i18n', () => mocks.i18nMock)
vi.mock('@/shared/context/AppContext', () => mocks.appContextMock)

let captured: ReturnType<typeof useBillingFilters> | undefined
function Probe() {
  captured = useBillingFilters()
  return null
}

function filterKeys(defs: NonNullable<typeof captured>['defs']) {
  const keys: string[] = []
  for (const def of defs) {
    keys.push(def.key)
  }
  return keys
}

describe('useBillingFilters', () => {
  it('wires the module filters, opening on the date range', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured ? filterKeys(captured.defs) : []).toEqual([
      'scheduled_on',
      'category',
      'payment_status',
      'payee_label',
      'amount',
      'closing_approval_follow_up',
      'record_type',
      'text',
    ])
    expect(captured ? filterKeys(captured.visibles) : []).toEqual(['scheduled_on'])
  })
})
