import { describe, expect, it } from 'vitest'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import row from '.'

const DEFAULT_ROW: Row = {
  id: 'r1',
  titulo: 'Post',
  empresa: 'EMC',
  estado: 'completado',
  fecha_inicio: '2026-08-17',
  fecha_entrega: null,
}

const EMPTY_OVERRIDES: Partial<Row> = {}

describe('row', () => {
  it('returns the exact default shape when called with no arguments', () => {
    const result = row()

    expect(result).toStrictEqual(DEFAULT_ROW)
  })

  it('returns the exact default shape when called with an empty overrides object', () => {
    const result = row(EMPTY_OVERRIDES)

    expect(result).toStrictEqual(DEFAULT_ROW)
  })

  it('overrides titulo alone and leaves every other field at its default', () => {
    const tituloOverride: Partial<Row> = { titulo: 'Reel' }
    const expected: Row = { ...DEFAULT_ROW, titulo: 'Reel' }

    const result = row(tituloOverride)

    expect(result).toStrictEqual(expected)
  })

  it('overrides id alone and leaves every other field at its default', () => {
    const idOverride: Partial<Row> = { id: 'r2' }
    const expected: Row = { ...DEFAULT_ROW, id: 'r2' }

    const result = row(idOverride)

    expect(result).toStrictEqual(expected)
  })

  it('overrides multiple fields at once and leaves the rest at their defaults', () => {
    const manyOverrides: Partial<Row> = { id: 'r3', titulo: 'Segunda', empresa: 'SVN' }
    const expected: Row = {
      ...DEFAULT_ROW,
      id: 'r3',
      titulo: 'Segunda',
      empresa: 'SVN',
    }

    const result = row(manyOverrides)

    expect(result).toStrictEqual(expected)
  })

  it('overrides fecha_entrega from its null default to a non-null string', () => {
    const deliveryDateOverride: Partial<Row> = { fecha_entrega: '2026-08-20' }
    const expected: Row = { ...DEFAULT_ROW, fecha_entrega: '2026-08-20' }

    const result = row(deliveryDateOverride)

    expect(result).toStrictEqual(expected)
    expect(result.fecha_entrega).toStrictEqual(expected.fecha_entrega)
  })

  it('keeps fecha_entrega null when overriding an unrelated field', () => {
    const statusOverride: Partial<Row> = { estado: 'en_progreso', fecha_entrega: null }
    const expected: Row = { ...DEFAULT_ROW, estado: 'en_progreso', fecha_entrega: null }

    const result = row(statusOverride)

    expect(result).toStrictEqual(expected)
  })

  it('does not mutate the overrides object passed in', () => {
    const titleOverride: Partial<Row> = { titulo: 'Historia' }
    const overridesSnapshot: Partial<Row> = { ...titleOverride }

    row(titleOverride)

    expect(titleOverride).toStrictEqual(overridesSnapshot)
  })

  it('returns a new object on every call rather than a shared reference', () => {
    const first = row()
    const second = row()

    expect(first).not.toBe(second)
    expect(first).toStrictEqual(second)
  })
})
