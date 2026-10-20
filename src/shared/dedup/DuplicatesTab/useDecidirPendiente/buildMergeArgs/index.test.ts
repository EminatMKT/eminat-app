import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import buildMergeArgs from '.'

describe('buildMergeArgs', () => {
  it('maps the open pair, the merge values and the excluded ids into fusionar args', () => {
    const abierto = pendienteFixture()
    const args = buildMergeArgs('pacientes', abierto, { telefono: '555' }, ['c1'])
    expect(args).toEqual({
      entidad: 'pacientes',
      ganadorId: abierto.item_id_a,
      perdedorId: abierto.item_id_b,
      valoresFinales: { telefono: '555' },
      excludedIds: ['c1'],
    })
  })
})
