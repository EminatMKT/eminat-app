import { describe, it, expect } from 'vitest'
import * as directorio from './index'

describe('features/directorio API pública', () => {
  it('expone DirectorioModule', () => {
    expect(directorio.DirectorioModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(directorio.access).toEqual({ module: 'directorio' })
  })
})
