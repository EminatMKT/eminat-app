import { describe, it, expect, vi } from 'vitest'
import { buildImportPlan } from './index'
import type { Identity } from '../identity'

// Coerce trivial: celda vacía -> null, el resto tal cual. El plan de import no sabe de
// dominio, así que el test tampoco necesita ninguno.
const coerce = (_col: string, v: string): unknown => (v === '' ? null : v)

// La primera columna de `mapping` hace de clave de origen en todos estos tests: `fila[0]`.
function identityDePrueba(
  existentes: Map<string, string>,
  candidatosPorClave: Map<string, { nivel: 'exacta' | 'parcial'; id: string }[]> = new Map()
): Identity {
  return {
    claveOrigen: (fila) => fila[0],
    existente: (clave) => existentes.get(clave),
    candidatos: (fila) => candidatosPorClave.get(fila[0]) ?? [],
  }
}

describe('buildImportPlan', () => {
  const mapping = ['clave', 'nombre']

  it('una fila cuya clave ya existe va a toUpdate y no genera candidatos', () => {
    const identity = identityDePrueba(new Map([['c1', 'id-1']]))
    const candidatosSpy = vi.spyOn(identity, 'candidatos')

    const plan = buildImportPlan({ rows: [['c1', 'Ana']], mapping, identity, coerce })

    expect(plan.toUpdate).toEqual([{ id: 'id-1', values: { clave: 'c1', nombre: 'Ana' } }])
    expect(plan.toInsert).toEqual([])
    expect(plan.toMerge).toEqual([])
    expect(candidatosSpy).not.toHaveBeenCalled()
  })

  it('dos filas con la misma clave_origen colapsan a una sola en toInsert y cuentan como repetida', () => {
    const identity = identityDePrueba(new Map())

    const plan = buildImportPlan({
      rows: [['c2', 'Ana'], ['c2', 'Ana otra vez']],
      mapping, identity, coerce,
    })

    expect(plan.toInsert).toHaveLength(1)
    expect(plan.repetidas).toBe(1)
  })

  it('una clave que existe con paciente_id null es una tumba: no se recrea', () => {
    // Cadena vacía = "existe, pero el destino la tiene con id null" — un borrado a propósito.
    const identity = identityDePrueba(new Map([['c3', '']]))

    const plan = buildImportPlan({ rows: [['c3', 'Ana']], mapping, identity, coerce })

    expect(plan.tumbas).toBe(1)
    expect(plan.toInsert).toEqual([])
    expect(plan.toUpdate).toEqual([])
  })

  it('un candidato exacto va a toMerge pre-marcado', () => {
    const identity = identityDePrueba(new Map(), new Map([['c4', [{ nivel: 'exacta', id: 'p1' }]]]))

    const plan = buildImportPlan({ rows: [['c4', 'Ana']], mapping, identity, coerce })

    expect(plan.toInsert).toEqual([])
    expect(plan.toMerge).toEqual([
      { values: { clave: 'c4', nombre: 'Ana' }, candidatos: [{ nivel: 'exacta', id: 'p1' }], preMarcado: true },
    ])
  })

  it('un candidato parcial va a toMerge sin pre-marcar', () => {
    const identity = identityDePrueba(new Map(), new Map([['c5', [{ nivel: 'parcial', id: 'p2' }]]]))

    const plan = buildImportPlan({ rows: [['c5', 'Ana']], mapping, identity, coerce })

    expect(plan.toMerge).toEqual([
      { values: { clave: 'c5', nombre: 'Ana' }, candidatos: [{ nivel: 'parcial', id: 'p2' }], preMarcado: false },
    ])
  })

  it('sin match ni candidatos, la fila va a toInsert', () => {
    const identity = identityDePrueba(new Map())

    const plan = buildImportPlan({ rows: [['c6', 'Ana']], mapping, identity, coerce })

    expect(plan.toInsert).toEqual([{ clave: 'c6', nombre: 'Ana' }])
  })

  it('descarta filas totalmente vacías: no cuentan para nada', () => {
    const identity = identityDePrueba(new Map())

    const plan = buildImportPlan({ rows: [['', '']], mapping, identity, coerce })

    expect(plan.toInsert).toEqual([])
    expect(plan.repetidas).toBe(0)
    expect(plan.tumbas).toBe(0)
  })
})
