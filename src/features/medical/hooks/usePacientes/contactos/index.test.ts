import { describe, it, expect } from 'vitest'
import contactRows from './index'

describe('contactRows', () => {
  it('builds one row per non-empty value, trimmed', () => {
    const rows = contactRows('p1', { telefono: ['  (305) 555-1111  '], email: ['a@b.com'] })
    expect(rows).toEqual([
      {
        paciente_id: 'p1',
        tipo: 'telefono',
        valor: '(305) 555-1111',
        fuente: 'manual',
        clave_origen: null,
      },
      {
        paciente_id: 'p1',
        tipo: 'email',
        valor: 'a@b.com',
        fuente: 'manual',
        clave_origen: null,
      },
    ])
  })

  it('skips empty, whitespace-only, and undefined values', () => {
    const rows = contactRows('p1', { telefono: ['', '   ', undefined], email: [undefined] })
    expect(rows).toEqual([])
  })

  it('keeps every non-empty candidate for a type, so an edit can carry both the old and the new value', () => {
    const rows = contactRows('p1', { telefono: ['(305) 555-1111', '(305) 555-2222'], email: [] })
    expect(rows).toHaveLength(2)
  })
})
