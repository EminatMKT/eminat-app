import { describe, expect, it } from 'vitest'
import responsables from './index'

const { esResponsable, etiquetaResponsablesCompacta, responsablePrincipal, responsablesOrdenados } = responsables
const usuarios = [{ id: 'u1', nombre: 'Carlos Delta' }, { id: 'u2', nombre: 'Ana Bravo' }, { id: 'u3', nombre: 'Bea Costa' }]
const r = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })
const act = (...responsables: ReturnType<typeof r>[]) => ({ responsables })
const ids = (rows: ReturnType<typeof r>[]) => rows.map(row => row.usuario_id)

describe('responsables helpers', () => {
  it('puts the leader first even when another display name sorts earlier', () => {
    expect(ids(responsablesOrdenados(act(r('u2'), r('u1', true), r('u3')), usuarios))).toEqual(['u1', 'u2', 'u3'])
  })

  it('without a leader picks the first display name alphabetically', () => {
    expect(responsablePrincipal(act(r('u1'), r('u3'), r('u2')), usuarios)).toEqual(r('u2'))
  })

  it('returns null when there are no responsibles', () => {
    expect(responsablePrincipal(act(), usuarios)).toBeNull()
    expect(responsablePrincipal({}, usuarios)).toBeNull()
  })

  it('checks membership and rejects empty ids', () => {
    const oneResponsible = act(r('u2'))
    expect(esResponsable(oneResponsible, 'u2')).toBe(true)
    expect(esResponsable(oneResponsible, 'u1')).toBe(false)
    expect(esResponsable(oneResponsible, null)).toBe(false)
    expect(esResponsable(oneResponsible, undefined)).toBe(false)
  })

  it('builds the compact label with extras and reports whether to render a crown', () => {
    const label = etiquetaResponsablesCompacta(act(r('u1'), r('u2', true), r('u3')), usuarios)
    expect(label).toEqual({ label: 'Ana Bravo +2', lider: true })
  })

  it('sorts blanks after names, uses email, breaks ties by id, and leaves input intact', () => {
    const userList = [{ id: 'blank', nombre: '   ' }, { id: 'named', nombre: 'Zoe Named' }, { id: 'mail', email: 'a@b.test' }]
    const rows = [r('missing'), r('z-last'), r('blank'), r('named'), r('mail')]
    const before = rows.map(row => ({ ...row }))
    const ordered = responsablesOrdenados({ responsables: rows }, userList)
    const emailLabel = etiquetaResponsablesCompacta(act(r('mail')), userList)

    expect(ids(ordered)).toEqual(['mail', 'named', 'blank', 'missing', 'z-last'])
    expect(emailLabel).toEqual({ label: 'a@b.test', lider: false })
    expect(rows).toEqual(before)
  })
})
