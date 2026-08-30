import { describe, it, expect } from 'vitest'
import { MODULE, MODULE_META, ALL_MODULES, isModuleSlug } from './index'

describe('catálogo de módulos', () => {
  it('isModuleSlug', () => {
    expect(isModuleSlug('cobranzas')).toBe(true)
    expect(isModuleSlug('x')).toBe(false)
    expect(isModuleSlug(null)).toBe(false)
  })

  // Candado: agregar o quitar un módulo tiene que ser un cambio consciente. Los literales son
  // un oráculo independiente de MODULE_META, así que el test no se arregla solo.
  it('ALL_MODULES = set canónico', () => {
    expect([...ALL_MODULES].sort()).toEqual(
      ['accounting','admin','cobranzas','directorio','medical','research','reuniones','stratix-mkt','th-hr'].sort()
    )
  })

  // El split del 29/08 puso los slugs en `slugs.ts` y el catálogo en `index.ts`. `tsc` ya obliga
  // a que MODULE_META tenga una entrada por slug; esto cubre el otro lado —que no sobre ninguna—
  // y deja escrito que las dos mitades son una sola cosa.
  it('MODULE y MODULE_META listan lo mismo', () => {
    expect(Object.values(MODULE).sort()).toEqual([...ALL_MODULES].sort())
  })

  it('cada entrada se describe a sí misma', () => {
    for (const slug of ALL_MODULES) {
      expect(MODULE_META[slug].slug).toBe(slug)
      expect(MODULE_META[slug].name.length).toBeGreaterThan(0)
    }
  })
})
