import { describe, expect, it } from 'vitest'
import meetHelpers, { responsablePrincipal, responsablesOrdenados } from './index'

const usuarios = [{ id: 'u1', nombre: 'Carlos Delta' }, { id: 'u2', nombre: 'Ana Bravo' }]
const act = { responsables: [{ usuario_id: 'u1', es_lider: false }, { usuario_id: 'u2', es_lider: false }] }

describe('responsables barrel', () => {
  it('the default object Meet reads holds the very functions the app imports by name', () => {
    expect(meetHelpers.responsablePrincipal).toBe(responsablePrincipal)
    expect(meetHelpers.responsablesOrdenados).toBe(responsablesOrdenados)
  })

  it('both read the same order', () => {
    const first = meetHelpers.responsablesOrdenados(act, usuarios)[0]
    expect(meetHelpers.responsablePrincipal(act, usuarios)).toEqual(first)
  })
})
