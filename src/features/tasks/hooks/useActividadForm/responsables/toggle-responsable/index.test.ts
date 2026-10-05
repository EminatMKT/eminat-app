import { describe, expect, it } from 'vitest'
import toggleResponsable from '.'

describe('toggleResponsable', () => {
  it('checking a user adds them with no leader by default', () => {
    expect(toggleResponsable([], 'u1', true)).toEqual([{ usuario_id: 'u1', es_lider: false }])
  })

  it('checking someone already in the list changes nothing', () => {
    const rows = [{ usuario_id: 'u1', es_lider: true }]
    expect(toggleResponsable(rows, 'u1', true)).toBe(rows)
  })

  it('unchecking the leader clears leadership', () => {
    const rows = [
      { usuario_id: 'u1', es_lider: true },
      { usuario_id: 'u2', es_lider: false },
    ]
    expect(toggleResponsable(rows, 'u1', false)).toEqual([{ usuario_id: 'u2', es_lider: false }])
  })
})
