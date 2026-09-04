import { describe, it, expect } from 'vitest'
import { defaultFilterValues, resolveFilterValues } from './index'
import { applyFilters, type FilterDef } from '../defs'

// El caso real: un tablero que se abre en el área de quien mira y se puede abrir a las demás.
type Tarea = { area: string }
const tareas: Tarea[] = [{ area: 'mkt' }, { area: 'med' }, { area: 'mkt' }]
const DEFS: FilterDef<Tarea>[] = [
  { key: 'area', labelKey: 'x', defaultValue: 'mkt', match: (a, v) => a.area === v },
  { key: 'estado', labelKey: 'x', match: () => true },
]
const SIN_DEFAULT: FilterDef<Tarea>[] = [{ key: 'area', labelKey: 'x', match: (a, v) => a.area === v }]

describe('defaultFilterValues', () => {
  it('sólo trae los defs que declaran uno', () => {
    expect(defaultFilterValues(DEFS)).toEqual({ area: 'mkt' })
    expect(defaultFilterValues(SIN_DEFAULT)).toEqual({})
  })

  it('filtrar con los defaults da lo mismo que ponerlos a mano', () => {
    expect(applyFilters(tareas, DEFS, defaultFilterValues(DEFS)))
      .toEqual(applyFilters(tareas, DEFS, { area: 'mkt' }))
  })
})

describe('resolveFilterValues', () => {
  // La distinción que hace que quitar un filtro y recargar den lo mismo: «sin tocar» (la clave
  // no está) toma el default; «vacío» (la clave está en '') es una elección y se respeta.
  it('«sin tocar» toma el default y «vacío» se respeta', () => {
    expect(resolveFilterValues(DEFS, {})).toEqual({ area: 'mkt' })
    expect(resolveFilterValues(DEFS, { area: '' })).toEqual({ area: '' })
    expect(resolveFilterValues(DEFS, { area: 'med' })).toEqual({ area: 'med' })
  })

  it('un valor guardado de un def sin default sobrevive', () => {
    expect(resolveFilterValues(DEFS, { estado: 'Pendiente' }))
      .toEqual({ area: 'mkt', estado: 'Pendiente' })
  })
})
