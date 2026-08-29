import { describe, it, expect } from 'vitest'
import { getModulesForRole, normalizeRole, ADMIN_ROLE, DEFAULT_ROLE } from './index'
import type { RoleModuleMap } from './types'
import { ALL_MODULES } from '../modulos'

const MAP: RoleModuleMap = { stratix360: ['stratix-mkt', 'directorio'], finanzas: ['cobranzas'] }

describe('getModulesForRole', () => {
  it('devuelve los módulos del rol', () => {
    expect(getModulesForRole(MAP, 'stratix360')).toEqual(['stratix-mkt', 'directorio'])
  })
  it('rol desconocido → []', () => { expect(getModulesForRole(MAP, 'nope')).toEqual([]) })
  it('null → []', () => { expect(getModulesForRole(MAP, null)).toEqual([]) })
  it('admin → ALL_MODULES (short-circuit, aun con mapa vacío)', () => {
    expect(getModulesForRole({}, ADMIN_ROLE).sort()).toEqual([...ALL_MODULES].sort())
  })
  it('devuelve una copia: mutarla no toca el catálogo', () => {
    // El largo se toma antes: cuántos módulos hay es el candado de `modulos/index.test.ts`,
    // acá lo único que se prueba es que el array no se pise. Escribir el número a mano
    // obligaba a tocar dos tests por cada módulo nuevo.
    const antes = ALL_MODULES.length
    getModulesForRole({}, ADMIN_ROLE).pop()
    expect(ALL_MODULES).toHaveLength(antes)
  })
})

// (no hay canAccess: la pertenencia se chequea con `getModulesForRole(...).includes(slug)`,
//  método nativo; ModuleSlug ya tipa el slug.)

describe('normalizeRole', () => {
  it('mapea legacy', () => {
    expect(normalizeRole('superadmin')).toBe('admin')
    expect(normalizeRole('pasante')).toBe('stratix360')
  })
  it('pasa keys dinámicas tal cual', () => { expect(normalizeRole('soporte')).toBe('soporte') })
  it('no-string o vacío → null', () => {
    expect(normalizeRole(null)).toBeNull()
    expect(normalizeRole('')).toBeNull()
  })
})

describe('constantes', () => {
  it('ADMIN_ROLE y DEFAULT_ROLE', () => {
    expect(ADMIN_ROLE).toBe('admin')
    expect(DEFAULT_ROLE).toBe('sin_asignar')
  })
})
