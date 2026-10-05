import { describe, it, expect } from 'vitest'
import slugifyRoleKey from './index'

describe('slugifyRoleKey', () => {
  it('lowercases, strips diacritics and joins with a separator', () => {
    expect(slugifyRoleKey('Investigación')).toBe('investigacion')
    expect(slugifyRoleKey('Contabilidad / RRHH')).toBe('contabilidad_rrhh')
    expect(slugifyRoleKey('Médico')).toBe('medico')
  })
  it('falls back to a rol_ prefix when nothing is left', () => { expect(slugifyRoleKey('🎉')).toMatch(/^rol_/) })
  it('result matches ^[a-z][a-z0-9_]*$', () => {
    expect(slugifyRoleKey('Soporte 24/7')).toMatch(/^[a-z][a-z0-9_]*$/)
  })
})
