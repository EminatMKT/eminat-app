import { describe, expect, it } from 'vitest'
import responsablePrincipal from '.'

const usuarios = [{ id: 'u1', nombre: 'Carlos Delta' }, { id: 'u2', nombre: 'Ana Bravo' }, { id: 'u3', nombre: 'Bea Costa' }]
const r = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })

describe('responsablePrincipal', () => {
  it('without a leader picks the first display name alphabetically', () => {
    const act = { responsables: [r('u1'), r('u3'), r('u2')] }
    expect(responsablePrincipal(act, usuarios)).toEqual(r('u2'))
  })

  it('the leader wins over the alphabet', () => {
    const act = { responsables: [r('u2'), r('u1', true)] }
    expect(responsablePrincipal(act, usuarios)).toEqual(r('u1', true))
  })

  it('returns null when there are no responsibles', () => {
    expect(responsablePrincipal({ responsables: [] }, usuarios)).toBeNull()
    expect(responsablePrincipal({}, usuarios)).toBeNull()
  })
})
