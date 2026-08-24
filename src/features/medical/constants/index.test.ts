import { describe, it, expect } from 'vitest'
import { GENERO_META, GENEROS, generoLabel, ESTADOS_PACIENTE, FUENTES } from './index'

describe('catálogos de Medical', () => {
  it('deriva las listas del objeto META, en orden', () => {
    expect(GENEROS).toEqual(['M', 'F', 'NB', 'ND'])
    expect(ESTADOS_PACIENTE).toEqual(['activo', 'inactivo', 'alta'])
    expect(FUENTES).toEqual(['ecw', 'eclinpro', 'emed', 'manual'])
  })

  it('los valores canónicos coinciden con los DOMAIN de la migración', () => {
    // Si esto falla, la base y el front listan cosas distintas y el insert va a
    // reventar con "violates check constraint" recién en runtime.
    expect(Object.keys(GENERO_META)).toEqual(['M', 'F', 'NB', 'ND'])
  })

  it('traduce por clave i18n y NUNCA devuelve el valor canónico', () => {
    const t = (k: string) => `[${k}]`
    expect(generoLabel('M', t)).toBe('[med.genero.M]')
    expect(generoLabel('F', t)).toBe('[med.genero.F]')
  })

  it('un valor desconocido no rompe: devuelve el crudo como último recurso', () => {
    const t = (k: string) => `[${k}]`
    expect(generoLabel('XX', t)).toBe('XX')
  })
})
