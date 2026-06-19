import { describe, it, expect } from 'vitest'
import * as cobranzas from './index'

describe('features/cobranzas API pública', () => {
  it('expone CobranzasModule', () => {
    expect(cobranzas.CobranzasModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(cobranzas.access).toEqual({ module: 'cobranzas' })
  })
})
