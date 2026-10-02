import { describe, expect, it } from 'vitest'
import canonicalResponsibles from '.'

const anaId = '22222222-2222-4222-8222-222222222222'
const betoId = '33333333-3333-4333-8333-333333333333'
const ana = { id: anaId, nombre: 'Ana', apellido: 'Pérez' }
const beto = { id: betoId, nombre_display: 'Beto Ruiz' }

describe('canonicalResponsibles', () => {
  it('without a leader, the principal is the first one alphabetically', () => {
    const rows = [
      { usuario_id: betoId, es_lider: false, usuarios: beto },
      { usuario_id: anaId, es_lider: false, usuarios: [ana] },
    ]
    const result = canonicalResponsibles(rows)
    const listed = [
      { id: anaId, nombre: 'Ana Pérez', es_lider: false },
      { id: betoId, nombre: 'Beto Ruiz', es_lider: false },
    ]
    expect(result.responsable_id).toBe(anaId)
    expect(result.responsables).toEqual(listed)
    expect(result.principal?.id).toBe(anaId)
  })

  it('the leader is the principal even when it sorts later', () => {
    const rows = [
      { usuario_id: anaId, es_lider: false, usuarios: ana },
      { usuario_id: betoId, es_lider: true, usuarios: beto },
    ]
    const result = canonicalResponsibles(rows)
    const principal = { id: betoId, nombre: 'Beto Ruiz' }
    expect(result.responsable_id).toBe(betoId)
    expect(result.responsable).toEqual(principal)
    expect(result.responsables.map((row) => row.id)).toEqual([betoId, anaId])
  })

  it('no rows means a null principal and an empty list', () => {
    const result = canonicalResponsibles(null)
    expect(result.responsable_id).toBeNull()
    expect(result.responsable).toBeNull()
    expect(result.responsables).toEqual([])
  })
})
