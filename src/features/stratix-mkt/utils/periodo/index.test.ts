import { describe, it, expect } from 'vitest'
import { claveMes, trimestreDe, periodoLargo, periodosDisponibles } from './index'

describe('claveMes', () => {
  it('recorta el día, y sin dato devuelve vacío en vez de reventar', () => {
    expect(claveMes('2026-08-17')).toBe('2026-08')
    expect(claveMes(null)).toBe('')
  })
})

describe('trimestreDe', () => {
  it('mapea los cuatro trimestres', () => {
    expect(trimestreDe('2026-02-14')).toBe('Q1')
    expect(trimestreDe('2026-04-01')).toBe('Q2')
    expect(trimestreDe('2026-09-30')).toBe('Q3')
    expect(trimestreDe('2026-12-25')).toBe('Q4')
  })
  it('marzo es Q1 — lo que la columna guardaba mal en 45 filas de producción', () => {
    expect(trimestreDe('2026-03-17')).toBe('Q1')
  })
  it('sin dato o con basura devuelve vacío, no un Q1 inventado', () => {
    expect(trimestreDe(null)).toBe('')
    expect(trimestreDe('basura')).toBe('')
  })
})

describe('periodoLargo', () => {
  it('nombra el mes en el idioma de quien mira, largo y corto', () => {
    expect(periodoLargo('2026-08-17', 'es-EC')).toMatch(/agosto.*2026/i)
    expect(periodoLargo('2026-08-17', 'en-US')).toMatch(/August.*2026/i)
    expect(periodoLargo('2026-08-17', 'en-US', 'short')).toMatch(/Aug.*2026/i)
  })
  it('no cae en la trampa de UTC: parte el string, no hace new Date del ISO', () => {
    expect(periodoLargo('2026-01-01', 'en-US')).toMatch(/January.*2026/i)
  })
  it('sin dato devuelve el guion, no "Invalid Date"', () => {
    expect(periodoLargo(null, 'es-EC')).toBe('—')
  })
})

describe('periodosDisponibles', () => {
  it('los 12 de cada año presente; 24 con dos años; el corriente si no hay ninguno', () => {
    const uno = periodosDisponibles(['2026-03-17', '2026-08-02'])
    expect([uno.length, uno[0], uno[11]]).toEqual([12, '2026-01', '2026-12'])
    expect(periodosDisponibles(['2026-03-17', '2027-01-09'])).toHaveLength(24)
    expect(periodosDisponibles([])[0].slice(0, 4)).toBe(String(new Date().getFullYear()))
  })
})
