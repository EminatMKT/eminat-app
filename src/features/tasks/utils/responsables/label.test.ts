import { describe, it, expect } from 'vitest'
import responsibleNames from './label'

const names = { u1: 'Zoe', u2: 'Ana', u3: 'Bruno' }
const owners = (...ids: string[]) => ids.map(usuario_id => ({ usuario_id, es_lider: false }))

describe('responsibleNames', () => {
  it('lists every responsible, leader first and then alphabetically', () => {
    const responsables = [
      { usuario_id: 'u2', es_lider: false },
      { usuario_id: 'u1', es_lider: true },
      { usuario_id: 'u3', es_lider: false },
    ]
    expect(responsibleNames({ responsables }, names)).toBe('Zoe, Ana, Bruno')
  })

  it('prints the dash when nobody is responsible', () => {
    expect(responsibleNames({ responsables: [] }, names)).toBe('—')
    expect(responsibleNames({}, names)).toBe('—')
  })

  it('prints the dash for a responsible whose name is unknown', () => {
    expect(responsibleNames({ responsables: owners('u1', 'ghost') }, names)).toBe('Zoe, —')
  })
})
