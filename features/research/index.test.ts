import { describe, it, expect } from 'vitest'
import * as research from './index'

describe('features/research API pública', () => {
  it('expone ResearchModule', () => {
    expect(research.ResearchModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(research.access).toEqual({ module: 'research' })
  })
})
