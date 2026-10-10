import { describe, it, expect } from 'vitest'
import type { MiembroAsignable, FlashMessage } from './index'

describe('AppContextType helper shapes', () => {
  it('MiembroAsignable carries id and nombre', () => {
    const member: MiembroAsignable = { id: 'u1', nombre: 'Ana' }
    expect(member.nombre).toBe('Ana')
  })

  it('FlashMessage carries tipo and texto', () => {
    const msg: FlashMessage = { tipo: 'ok', texto: 'listo' }
    expect(msg.tipo).toBe('ok')
  })
})
