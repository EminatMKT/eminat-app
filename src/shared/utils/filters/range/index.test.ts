import { describe, it, expect } from 'vitest'
import enRango from './index'

describe('enRango', () => {
  it('incluye los dos extremos', () => {
    expect(enRango('2026-03-15..2026-04-10', '2026-03-15')).toBe(true)
    expect(enRango('2026-03-15..2026-04-10', '2026-04-10')).toBe(true)
    expect(enRango('2026-03-15..2026-04-10', '2026-03-28')).toBe(true)
  })

  it('deja afuera lo que cae antes o después', () => {
    expect(enRango('2026-03-15..2026-04-10', '2026-03-14')).toBe(false)
    expect(enRango('2026-03-15..2026-04-10', '2026-04-11')).toBe(false)
  })

  // Es lo que hoy se consigue dejando uno de los dos controles sueltos sin llenar.
  it('un extremo vacío abre el rango de ese lado', () => {
    expect(enRango('..2026-04-10', '2001-01-01')).toBe(true)
    expect(enRango('..2026-04-10', '2026-04-11')).toBe(false)
    expect(enRango('2026-03-15..', '2099-12-31')).toBe(true)
    expect(enRango('2026-03-15..', '2026-03-14')).toBe(false)
  })

  it('una fila sin fecha queda fuera del rango', () => {
    expect(enRango('2026-03-15..2026-04-10', null)).toBe(false)
    expect(enRango('..2026-04-10', '')).toBe(false)
    expect(enRango('2026-03-15..', undefined)).toBe(false)
  })

  // Los dos módulos guardan `date`, pero el motor no puede asumirlo: un timestamp comparado
  // entero contra 'YYYY-MM-DD' dejaría afuera el último día del rango.
  it('recorta el día de un timestamp', () => {
    expect(enRango('2026-03-15..2026-04-10', '2026-04-10T18:30:00Z')).toBe(true)
  })

  it('un rango invertido no devuelve nada, en vez de devolver todo', () => {
    expect(enRango('2026-04-10..2026-03-15', '2026-03-28')).toBe(false)
  })
})
