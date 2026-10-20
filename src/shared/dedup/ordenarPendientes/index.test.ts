import { describe, expect, it } from 'vitest'
import ordenarPendientes from '.'
import type { Pendiente } from '../types'

describe('ordenarPendientes', () => {
  it('puts exacta before parcial, oldest first within the same level', () => {
    const pares: Pendiente[] = [
      {
        item_id_a: 'a',
        item_id_b: 'b',
        nivel: 'parcial',
        detectado_at: '2026-01-02',
      },
      {
        item_id_a: 'c',
        item_id_b: 'd',
        nivel: 'exacta',
        detectado_at: '2026-01-03',
      },
      {
        item_id_a: 'e',
        item_id_b: 'f',
        nivel: 'exacta',
        detectado_at: '2026-01-01',
      },
    ]

    const resultado = ordenarPendientes(pares)

    expect(resultado.map((p) => p.item_id_a)).toEqual(['e', 'c', 'a'])
  })
})
