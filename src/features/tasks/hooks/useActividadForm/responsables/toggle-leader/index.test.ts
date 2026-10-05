import { describe, expect, it } from 'vitest'
import toggleLeader from '.'

describe('toggleLeader', () => {
  it('crown click sets that user as sole leader', () => {
    const rows = [
      { usuario_id: 'u1', es_lider: false },
      { usuario_id: 'u2', es_lider: true },
    ]
    const expected = [
      { usuario_id: 'u1', es_lider: true },
      { usuario_id: 'u2', es_lider: false },
    ]
    expect(toggleLeader(rows, 'u1')).toEqual(expected)
  })

  it('crown click on active leader unsets leadership', () => {
    const rows = [{ usuario_id: 'u1', es_lider: true }]
    expect(toggleLeader(rows, 'u1')).toEqual([{ usuario_id: 'u1', es_lider: false }])
  })

  it('unchecked rows cannot be leaders', () => {
    expect(toggleLeader([], 'u1')).toEqual([])
  })
})
