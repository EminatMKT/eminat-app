import { describe, it, expect } from 'vitest'
import { ocultosPorDefecto, ocultosVigentes } from './index'
import type { VistaFiltro } from '@/shared/data'
import type { FilterDef } from '@/shared/utils'

const vista = (ocultos: string[]): VistaFiltro => ({
  id: 'v1', ambito: 'x', nombre: 'Mi vista', valores: {}, ocultos, abre_por_defecto: false,
})

const defs = ['estado', 'empresa', 'area', 'periodo']
  .map(key => ({ key, labelKey: 'common.filter.pick', nameKey: 'common.filter.pick', match: () => true })) as FilterDef<unknown>[]

describe('ocultosPorDefecto', () => {
  it('esconde todo lo que no está entre los principales', () => {
    expect(ocultosPorDefecto(defs, ['estado', 'empresa'])).toEqual(['area', 'periodo'])
  })

  it('sin lista de principales no esconde nada', () => {
    expect(ocultosPorDefecto(defs)).toEqual([])
  })

  it('un principal que no existe entre los defs no esconde de más', () => {
    expect(ocultosPorDefecto(defs, ['estado', 'nadie'])).toEqual(['empresa', 'area', 'periodo'])
  })
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

  // Con `principales` el estado local ARRANCA lleno: si «no tocaste nada» se midiera por `length`,
  // la vista de apertura no volvería a esconder nada nunca.
  it('estar en el default cuenta como no haber tocado nada, aunque el default esconda', () => {
    expect(ocultosVigentes(['area', 'periodo'], ['area', 'periodo'], vista(['estado']))).toEqual(['estado'])
  })

  it('apartarse del default gana sobre la vista de apertura', () => {
    expect(ocultosVigentes(['area'], ['area', 'periodo'], vista(['estado']))).toEqual(['area'])
  })
})
