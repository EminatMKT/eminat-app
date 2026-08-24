import { describe, it, expect } from 'vitest'
import { coerceLeadValue, buildLeadPayload } from './fields'

// El contador nace en el Excel de Royner, así que la coerción tiene que aguantar lo que
// exporta una planilla real: enteros, coma decimal en locale es, celdas vacías y basura.
describe('coerceLeadValue de email_count', () => {
  it('convierte el texto del CSV a número', () => {
    expect(coerceLeadValue('email_count', '3')).toBe(3)
  })

  it('acepta la coma decimal que exporta Excel en locale español', () => {
    expect(coerceLeadValue('email_count', '3,0')).toBe(3)
  })

  it('una celda vacía es null, no 0 — "no sé cuántos" ≠ "cero correos"', () => {
    expect(coerceLeadValue('email_count', '')).toBeNull()
  })

  it('un valor no numérico es null en vez de NaN, para no reventar el insert', () => {
    expect(coerceLeadValue('email_count', 'tres')).toBeNull()
  })

  it('un negativo es null: un contador de correos enviados no puede ser negativo', () => {
    expect(coerceLeadValue('email_count', '-2')).toBeNull()
  })
})

describe('buildLeadPayload con campos read-only', () => {
  it('no incluye email_count: guardar el form no puede pisar el contador', () => {
    const payload = buildLeadPayload({ official_title: 'Estudio X', email_count: 99 })
    expect(payload).not.toHaveProperty('email_count')
    expect(payload.official_title).toBe('Estudio X')
  })
})
