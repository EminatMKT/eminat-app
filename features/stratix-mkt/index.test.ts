import { describe, it, expect } from 'vitest'
import * as stratix from './index'

describe('features/stratix-mkt API pública', () => {
  it('expone StratixModule', () => {
    expect(stratix.StratixModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(stratix.access).toEqual({ module: 'stratix-mkt' })
  })
})
