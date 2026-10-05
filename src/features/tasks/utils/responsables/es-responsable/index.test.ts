import { describe, expect, it } from 'vitest'
import esResponsable from '.'

describe('esResponsable', () => {
  it('checks membership and rejects empty ids', () => {
    const oneResponsible = { responsables: [{ usuario_id: 'u2', es_lider: false }] }
    expect(esResponsable(oneResponsible, 'u2')).toBe(true)
    expect(esResponsable(oneResponsible, 'u1')).toBe(false)
    expect(esResponsable(oneResponsible, null)).toBe(false)
    expect(esResponsable(oneResponsible, undefined)).toBe(false)
  })

  it('a task with no list has nobody', () => {
    expect(esResponsable({}, 'u1')).toBe(false)
    expect(esResponsable({ responsables: null }, 'u1')).toBe(false)
  })
})
