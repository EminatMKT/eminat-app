import { describe, it, expect } from 'vitest'
import { ocultosVigentes, vistaModificada } from './index'
import type { VistaFiltro } from '@/shared/data'

const vista = (p: Partial<VistaFiltro> = {}): VistaFiltro => ({
  id: 'v1', ambito: 'x', nombre: 'Mi vista', valores: {}, ocultos: [], abre_por_defecto: false, ...p,
})

describe('ocultosVigentes', () => {
  it('lo tuyo gana sobre lo que esconde la vista de apertura', () => {
    expect(ocultosVigentes(['area'], vista({ ocultos: ['estado'] }))).toEqual(['area'])
  })

  it('sin nada escondido valen los de la vista de apertura', () => {
    expect(ocultosVigentes([], vista({ ocultos: ['estado'] }))).toEqual(['estado'])
  })

  it('sin vista de apertura no hay nada escondido', () => {
    expect(ocultosVigentes([], undefined)).toEqual([])
  })
})

describe('vistaModificada', () => {
  it('sin vista aplicada no hay nada que comparar', () => {
    expect(vistaModificada({ area: 'mkt' }, [], undefined)).toBe(false)
  })

  it('aplicar una vista y no tocar nada no la marca modificada', () => {
    expect(vistaModificada({ area: 'mkt' }, ['estado'], vista({ valores: { area: 'mkt' }, ocultos: ['estado'] })))
      .toBe(false)
  })

  // El orden en que escondiste dos filtros no es un cambio: si se compararan como listas, mover
  // uno de lugar marcaría la vista modificada sin que se vea distinta.
  it('los ocultos se comparan como conjuntos, no como listas', () => {
    const v = vista({ ocultos: ['area', 'estado'] })
    expect(vistaModificada({}, ['estado', 'area'], v)).toBe(false)
    expect(vistaModificada({}, ['area'], v)).toBe(true)
  })

  it('cambiar un valor sí la marca modificada', () => {
    expect(vistaModificada({ area: 'med' }, [], vista({ valores: { area: 'mkt' } }))).toBe(true)
  })
})
