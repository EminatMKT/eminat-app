import { describe, it, expect } from 'vitest'
import { ocultosPorDefecto, ocultosVigentes } from './index'
import type { VistaFiltro } from '@/shared/data'
import type { FilterDef } from '@/shared/utils'

const vista = (ocultos: string[]): VistaFiltro => ({
  id: 'v1', ambito: 'x', nombre: 'Mi vista', valores: {}, ocultos, abre_por_defecto: false,
})

const armar = (principales: string[]) => ['estado', 'empresa', 'area', 'fecha_inicio']
  .map(key => ({ key, labelKey: 'common.filter.pick', nameKey: 'common.filter.pick',
    principal: principales.includes(key), match: () => true })) as FilterDef<unknown>[]

describe('ocultosPorDefecto', () => {
  it('esconde todo lo que no se declaró principal', () => {
    expect(ocultosPorDefecto(armar(['estado', 'empresa']))).toEqual(['area', 'fecha_inicio'])
  })

  it('sin ningún principal no esconde nada', () => {
    expect(ocultosPorDefecto(armar([]))).toEqual([])
  })

  // No hay tercer caso: un principal que nombra una clave inexistente ya no se puede escribir.
})

describe('ocultosVigentes', () => {
  it('lo tuyo gana sobre lo que esconde la vista de apertura', () => {
    expect(ocultosVigentes(['area'], [], vista(['estado']))).toEqual(['area'])
  })

  it('sin nada escondido valen los de la vista de apertura', () => {
    expect(ocultosVigentes([], [], vista(['estado']))).toEqual(['estado'])
  })

  it('sin vista de apertura no hay nada escondido', () => {
    expect(ocultosVigentes([], [], undefined)).toEqual([])
  })

  // Con defs `principal` el estado local ARRANCA lleno: si «no tocaste nada» se midiera por
  // `length`, la vista de apertura no volvería a esconder nada nunca.
  it('estar en el default cuenta como no haber tocado nada, aunque el default esconda', () => {
    expect(ocultosVigentes(['area', 'periodo'], ['area', 'periodo'], vista(['estado']))).toEqual(['estado'])
  })

  it('apartarse del default gana sobre la vista de apertura', () => {
    expect(ocultosVigentes(['area'], ['area', 'periodo'], vista(['estado']))).toEqual(['area'])
  })
})
