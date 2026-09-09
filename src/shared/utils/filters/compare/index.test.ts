import { describe, it, expect } from 'vitest'
import { sameFilters } from './index'

describe('sameFilters', () => {
  it('el orden de las claves no cuenta', () => {
    expect(sameFilters({ area: 'mkt', estado: 'x' }, { estado: 'x', area: 'mkt' })).toBe(true)
  })

  // «Sin tocar» y «puesto en Todos» filtran igual, así que para saber si la pantalla todavía es
  // la vista guardada tienen que contar como lo mismo. Si no, aplicar una vista y no tocar nada
  // la marcaría como modificada apenas el motor rellene una clave con cadena vacía.
  it('la clave ausente y la cadena vacía son lo mismo', () => {
    expect(sameFilters({ area: 'mkt' }, { area: 'mkt', estado: '' })).toBe(true)
    expect(sameFilters({}, { area: '' })).toBe(true)
  })

  it('un valor distinto sí cuenta', () => {
    expect(sameFilters({ area: 'mkt' }, { area: 'med' })).toBe(false)
    expect(sameFilters({ area: 'mkt' }, {})).toBe(false)
  })
})
