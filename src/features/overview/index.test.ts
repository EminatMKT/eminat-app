import { describe, it, expect } from 'vitest'
import * as overview from './index'
import { BRANDS } from './data'

describe('features/overview API pública', () => {
  it('expone OverviewModule', () => {
    expect(overview.OverviewModule).toBeDefined()
  })
  it('declara su access admin-only', () => {
    expect(overview.access).toEqual({ module: 'overview', adminOnly: true })
  })
  it('toda marca tiene key única', () => {
    expect(new Set(BRANDS.map(b => b.key)).size).toBe(BRANDS.length)
  })
})
