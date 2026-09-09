import { describe, it, expect } from 'vitest'
import esSlugConocido from './index'
import { validateModuleSlugs } from '@/shared/auth/roleValidation'

describe('esSlugConocido', () => {
  it('reconoce un slug retirado', () => {
    expect(esSlugConocido('tasks')).toBe(true)
  })
  it('no reconoce uno que nunca existió', () => {
    expect(esSlugConocido('medial')).toBe(false)
  })
  // Un slug vigente NO es asunto de esta lista: lo resuelve `isModuleSlug`. Si algún día devuelve
  // true acá, es que alguien puso un slug vivo entre los retirados.
  it('no reconoce un slug vigente', () => {
    expect(esSlugConocido('medical')).toBe(false)
  })
})

// `role_modules` tiene filas del slug viejo Y del nuevo durante la convivencia; guardar un rol
// manda las dos, así que el validador no puede rechazar una retirada. OJO: hoy pasa por
// `isModuleSlug` (`MODULE.TASKS` todavía vale 'tasks'); es portante recién tras la Tarea 3.
describe('validateModuleSlugs con slugs retirados', () => {
  it('acepta un slug retirado que todavía tiene filas en la base', () => {
    expect(validateModuleSlugs(['tasks'])).toEqual({ ok: true })
  })
})
