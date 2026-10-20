import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import buildDiscardArgs from '.'

describe('buildDiscardArgs', () => {
  it('maps the open pair and the motive into descartar args', () => {
    const abierto = pendienteFixture()
    const args = buildDiscardArgs('pacientes', abierto, 'no_son_la_misma', 'nota')
    expect(args).toEqual({
      entidad: 'pacientes',
      itemIdA: abierto.item_id_a,
      itemIdB: abierto.item_id_b,
      motivo: 'no_son_la_misma',
      nota: 'nota',
    })
  })
})
