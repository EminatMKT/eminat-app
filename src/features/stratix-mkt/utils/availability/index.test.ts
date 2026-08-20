import { describe, it, expect } from 'vitest'
import { cargaDe, slotOcupado, HORAS_SEMANALES } from './index'

describe('cargaDe', () => {
  it('suma las horas y saca el resto de la semana', () => {
    const c = cargaDe([{ horas: 6 }, { horas: '4' }, { horas: null }])
    expect(c.horasOcupadas).toBe(10)
    expect(c.horasLibres).toBe(HORAS_SEMANALES - 10)
    expect(c.pctOcupado).toBe(25)
    expect(c.disponible).toBe(true)
  })

  it('no deja pasar del 100% ni deja horas libres negativas', () => {
    const c = cargaDe([{ horas: 60 }])
    expect(c.pctOcupado).toBe(100)
    expect(c.horasLibres).toBe(0)
    expect(c.disponible).toBe(false)
  })

  it('sin tareas, disponible y la semana entera libre', () => {
    expect(cargaDe([])).toEqual({ horasOcupadas: 0, horasLibres: HORAS_SEMANALES, pctOcupado: 0, disponible: true })
  })
})

describe('slotOcupado', () => {
  it('muy cargada: el día entero', () => {
    expect(slotOcupado(90, 9)).toBe(true)
    expect(slotOcupado(90, 17)).toBe(true)
  })

  it('medianamente cargada: solo el centro del día', () => {
    expect(slotOcupado(70, 9)).toBe(false)
    expect(slotOcupado(70, 12)).toBe(true)
    expect(slotOcupado(70, 15)).toBe(false)
  })

  it('poco cargada: ningún slot ocupado', () => {
    expect(slotOcupado(30, 12)).toBe(false)
  })
})
