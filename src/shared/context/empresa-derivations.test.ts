import { describe, it, expect } from 'vitest'
import { deriveMarcas, deriveColorMarca, COLOR_MARCA_FALLBACK } from './empresa-derivations'

const empresas = [
  { codigo: 'EMC', color: '#60A5FA', activo: true, recibe_actividades: true },
  { codigo: 'SVN', color: '#F472B6', activo: true, recibe_actividades: true },
  // de pertenencia: existe y está activa, pero no se le atribuyen actividades
  { codigo: 'ONDARA', color: '#06B6D4', activo: true, recibe_actividades: false },
  // desactivada: ya no opera, aunque siga marcada como atribuible
  { codigo: 'VIEJA', color: '#F87171', activo: false, recibe_actividades: true },
]

describe('deriveMarcas', () => {
  it('ofrece solo las activas y atribuibles', () => {
    expect(deriveMarcas(empresas).map(e => e.codigo)).toEqual(['EMC', 'SVN'])
  })

  it('excluye una desactivada aunque sea atribuible', () => {
    // La UI impide armar ese estado, pero la API y el SQL directo no: el filtro
    // no confía en esa invariante.
    expect(deriveMarcas(empresas).map(e => e.codigo)).not.toContain('VIEJA')
  })
})

describe('deriveColorMarca', () => {
  it('incluye TODAS las empresas, también las desactivadas y las no atribuibles', () => {
    // Es la regla que sostiene el histórico: una actividad de una empresa
    // desactivada se sigue pintando con su color, no con el fallback.
    expect(deriveColorMarca(empresas)).toEqual({
      EMC: '#60A5FA', SVN: '#F472B6', ONDARA: '#06B6D4', VIEJA: '#F87171',
    })
  })

  it('omite las empresas sin color en vez de mapearlas a undefined', () => {
    expect(deriveColorMarca([{ codigo: 'X', activo: true, recibe_actividades: true }])).toEqual({})
  })
})

describe('COLOR_MARCA_FALLBACK', () => {
  it('es el violeta que ya usaba getColorMarca', () => {
    expect(COLOR_MARCA_FALLBACK).toBe('#7C6FF7')
  })
})
