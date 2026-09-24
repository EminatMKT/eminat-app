import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BillingPage from '../page'

const MOUNTED = 'BILLING V2 MOUNTED'
vi.mock('@/features/billing-v2', () => ({ default: () => MOUNTED }))

describe('/billing page', () => {
  // A thin route: the gate, the loader and the shell all live in the feature it mounts.
  it('mounts billing v2 and nothing else', () => {
    expect(renderToStaticMarkup(<BillingPage />)).toBe(MOUNTED)
  })
})
