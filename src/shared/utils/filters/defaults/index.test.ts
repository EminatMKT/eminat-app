// centinela-exime: archivo-extenso@2 — son casos de prueba de UNA función y no lógica. Las tres
// capas de `resolveFilterValues` (el default del código, la vista guardada, lo tocado en la
// sesión) sólo se entienden leídas juntas: partirlas por archivo esconde cuál de las tres queda
// sin cubrir, que es justo el bug que estos casos vigilan.
import { describe, it, expect } from 'vitest'
import { defaultFilterValues, resolveFilterValues } from './index'
import { applyFilters } from '../defs'
import type { FilterDef } from '../types'

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

  // Las tres capas. La vista sólo interviene en la primera carga: elegir una del desplegable
  // ESCRIBE sus valores en el estado local, así que después lo que hay es lo que tocaste.
  it('la vista pisa a los defaults del código y lo tocado pisa a la vista', () => {
    expect(resolveFilterValues(DEFS, {}, { area: 'med' })).toEqual({ area: 'med' })
    expect(resolveFilterValues(DEFS, { area: 'ops' }, { area: 'med' })).toEqual({ area: 'ops' })
  })

  it('sin vista se comporta igual que antes', () => {
    expect(resolveFilterValues(DEFS, { area: 'ops' })).toEqual({ area: 'ops' })
  })

  // «Todas las áreas» guardado como cadena vacía sigue ganándole a la vista: si no, elegir «ver
  // todo» y recargar volvería a poner la vista, y no habría forma de salirse de ella.
  it('el vacío explícito le gana a la vista', () => {
    expect(resolveFilterValues(DEFS, { area: '' }, { area: 'med' })).toEqual({ area: '' })
  })
})
