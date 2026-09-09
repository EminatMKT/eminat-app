import { describe, it, expect } from 'vitest'
import monthRange from './index'
import enRango from '../index'

describe('monthRange', () => {
  it('cierra en el último día real del mes, bisiesto incluido', () => {
    expect(monthRange('2026-07')).toBe('2026-07-01..2026-07-31')
    expect(monthRange('2026-04')).toBe('2026-04-01..2026-04-30')
    expect(monthRange('2026-02')).toBe('2026-02-01..2026-02-28')
    expect(monthRange('2028-02')).toBe('2028-02-01..2028-02-29')
  })

  it('sin un mes válido devuelve vacío, que es «sin filtro»', () => {
    expect(monthRange('')).toBe('')
    expect(monthRange('2026-13')).toBe('')
  })

  // Es el par que usa la gráfica por mes del tablero: la barra arma el rango y el def lo lee.
  it('el rango que arma incluye todo el mes y nada de los vecinos', () => {
    const febrero = monthRange('2028-02')
    expect(enRango(febrero, '2028-02-29')).toBe(true)
    expect(enRango(febrero, '2028-01-31')).toBe(false)
    expect(enRango(febrero, '2028-03-01')).toBe(false)
  })
})
