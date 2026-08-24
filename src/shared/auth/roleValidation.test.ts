import { describe, it, expect } from 'vitest'
import { slugifyRoleKey, validateNewRole, validateModuleSlugs } from './roleValidation'
import type { RoleRow } from './permissions'

describe('slugifyRoleKey', () => {
  it('minúsculas + diacríticos + separador', () => {
    expect(slugifyRoleKey('Investigación')).toBe('investigacion')
    expect(slugifyRoleKey('Contabilidad / RRHH')).toBe('contabilidad_rrhh')
    expect(slugifyRoleKey('Médico')).toBe('medico')
  })
  it('fallback si queda vacío', () => { expect(slugifyRoleKey('🎉')).toMatch(/^rol_/) })
  it('resultado matchea ^[a-z][a-z0-9_]*$', () => {
    expect(slugifyRoleKey('Soporte 24/7')).toMatch(/^[a-z][a-z0-9_]*$/)
  })
})

const EXISTING: RoleRow[] = [{ key: 'admin', label: 'Administrador', is_system: true }]

describe('validateNewRole', () => {
  it('ok genera key del label', () => {
    const r = validateNewRole('Soporte', EXISTING)
    expect(r).toEqual({ ok: true, key: 'soporte' })
  })
  it('label duplicado → error', () => {
    expect(validateNewRole('Administrador', EXISTING).ok).toBe(false)
  })
  it('key reservada → error', () => {
    expect(validateNewRole('Todos', EXISTING).ok).toBe(false)
    expect(validateNewRole('Admin', EXISTING).ok).toBe(false)
  })
  it('key duplicada → dedupe con sufijo', () => {
    const ex: RoleRow[] = [{ key: 'soporte', label: 'Soporte viejo', is_system: false }]
    const r = validateNewRole('Soporte', ex)
    expect(r.ok && r.key).toBe('soporte_2')
  })
  it('label vacío → error', () => { expect(validateNewRole('  ', EXISTING).ok).toBe(false) })
})

describe('validateModuleSlugs', () => {
  it('todos válidos → ok', () => { expect(validateModuleSlugs(['cobranzas', 'directorio']).ok).toBe(true) })
  it('uno inválido → error', () => { expect(validateModuleSlugs(['cobranzas', 'fake']).ok).toBe(false) })
})
