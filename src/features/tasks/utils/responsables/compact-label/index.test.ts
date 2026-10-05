import { describe, expect, it } from 'vitest'
import compactLabel from '.'

const usuarios = [{ id: 'u1', nombre: 'Carlos Delta' }, { id: 'u2', nombre: 'Ana Bravo' }, { id: 'u3', nombre: 'Bea Costa' }]
const r = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })

describe('compactLabel', () => {
  it('builds the label with extras and reports whether to render a crown', () => {
    const act = { responsables: [r('u1'), r('u2', true), r('u3')] }
    expect(compactLabel(act, usuarios)).toEqual({ label: 'Ana Bravo +2', lider: true })
  })

  it('falls back to the email, and to a dash with nobody', () => {
    const mailOnly = [{ id: 'mail', email: 'a@b.test' }]
    expect(compactLabel({ responsables: [r('mail')] }, mailOnly)).toEqual({ label: 'a@b.test', lider: false })
    expect(compactLabel({ responsables: [] }, usuarios)).toEqual({ label: '—', lider: false })
  })
})
