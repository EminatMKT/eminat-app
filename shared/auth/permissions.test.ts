import { describe, it, expect } from 'vitest'
import {
  getModulesForRole, normalizeRole, moduleForPath, isModuleSlug,
  ADMIN_ROLE, DEFAULT_ROLE, ALL_MODULES, type RoleModuleMap,
} from './permissions'

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
})

// (no hay canAccess: la pertenencia se chequea con `getModulesForRole(...).includes(slug)`,
//  método nativo; ModuleSlug ya tipa el slug. Cubierto por los casos de getModulesForRole.)

describe('normalizeRole', () => {
  it('mapea legacy', () => {
    expect(normalizeRole('superadmin')).toBe('admin')
    expect(normalizeRole('pasante')).toBe('stratix360')
  })
  it('pasa keys dinámicas tal cual', () => { expect(normalizeRole('soporte')).toBe('soporte') })
  it('no-string o vacío → null', () => {
    expect(normalizeRole(null)).toBeNull(); expect(normalizeRole('')).toBeNull()
  })
})

describe('moduleForPath', () => {
  it('mapea ruta a slug', () => { expect(moduleForPath('/cobranzas/x')).toBe('cobranzas') })
  it('overview → admin', () => { expect(moduleForPath('/overview')).toBe('admin') })
  it('ruta no gateada → null', () => { expect(moduleForPath('/login')).toBeNull() })
})

describe('constantes', () => {
  it('ADMIN_ROLE y DEFAULT_ROLE', () => {
    expect(ADMIN_ROLE).toBe('admin'); expect(DEFAULT_ROLE).toBe('sin_asignar')
  })
  it('isModuleSlug', () => { expect(isModuleSlug('cobranzas')).toBe(true); expect(isModuleSlug('x')).toBe(false) })
  // candado: agregar/quitar un módulo debe ser un cambio consciente (literales = oráculo independiente)
  it('ALL_MODULES = set canónico', () => {
    expect([...ALL_MODULES].sort()).toEqual(
      ['accounting','admin','cobranzas','directorio','medical','research','stratix-mkt','th-hr'].sort()
    )
  })
})
