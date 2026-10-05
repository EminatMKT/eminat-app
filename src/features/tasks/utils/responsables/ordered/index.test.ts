import { describe, expect, it } from 'vitest'
import ordered from '.'

const users = [{ id: 'u1', nombre: 'Carlos Delta' }, { id: 'u2', nombre: 'Ana Bravo' }, { id: 'u3', nombre: 'Bea Costa' }]
const r = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })
const ids = (rows: ReturnType<typeof r>[]) => rows.map(row => row.usuario_id)

describe('ordered', () => {
  it('puts the leader first, then the rest by display name', () => {
    const act = { responsables: [r('u1'), r('u3', true), r('u2')] }
    expect(ids(ordered(act, users))).toEqual(['u3', 'u2', 'u1'])
  })

  it('treats a missing list as nobody', () => {
    expect(ordered({}, users)).toEqual([])
    expect(ordered({ responsables: null }, users)).toEqual([])
  })

  it('does not reorder the list it was given', () => {
    const rows = [r('u1'), r('u2')]
    ordered({ responsables: rows }, users)
    expect(ids(rows)).toEqual(['u1', 'u2'])
  })
})
