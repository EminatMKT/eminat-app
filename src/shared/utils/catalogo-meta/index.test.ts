import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import { catalogoMeta } from './index'

// El traductor de mentira devuelve la clave: así el test verifica QUÉ clave se pidió, que es
// lo único que esta función decide. Con qué texto se traduce es problema de es.json/en.json.
const t = (k: I18nKey) => k as string

const CAT = catalogoMeta({
  presencial: { labelKey: 'common.all' as I18nKey, color: '#7C6FF7' },
  virtual: { labelKey: 'common.cancel' as I18nKey },
})

describe('catalogoMeta', () => {
  it('deriva la lista de valores en el orden declarado', () => {
    expect(CAT.valores).toEqual(['presencial', 'virtual'])
  })

  it('deriva el mapa de colores, con cadena vacía cuando no hay color', () => {
    expect(CAT.colores).toEqual({ presencial: '#7C6FF7', virtual: '' })
  })

  it('traduce por la clave del catálogo, nunca por el valor canónico', () => {
    expect(CAT.label('presencial', t)).toBe('common.all')
  })

  // Los tres casos del borde. El valor de afuera se muestra crudo a propósito: es un bug de
  // quien lo emite, y taparlo con '—' lo volvería invisible.
  it('un valor fuera del catálogo se muestra crudo', () => {
    expect(CAT.label('inventado', t)).toBe('inventado')
  })
  it('undefined y cadena vacía caen al guión', () => {
    expect(CAT.label(undefined, t)).toBe('—')
    expect(CAT.label('', t)).toBe('—')
  })

  it('el mapa de colores no comparte referencia con el META', () => {
    CAT.colores.presencial = 'pisado'
    expect(catalogoMeta({ presencial: { labelKey: 'common.all' as I18nKey, color: '#7C6FF7' } }).colores.presencial)
      .toBe('#7C6FF7')
  })
})
