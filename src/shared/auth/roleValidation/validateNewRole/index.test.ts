import { describe, it, expect } from 'vitest'
import validateNewRole from './index'
import type { RoleRow } from '@/shared/auth/permissions'

const EXISTING: RoleRow[] = [{ key: 'admin', label: 'Administrador', is_system: true }]

const MISSING_LABEL = undefined

describe('validateNewRole', () => {
  it('a missing label (a body without one) is "name required", not a crash', () => {
    expect(validateNewRole(MISSING_LABEL, EXISTING).ok).toBe(false)
  })
  it('ok derives the key from the label', () => {
    const r = validateNewRole('Soporte', EXISTING)
    expect(r).toEqual({ ok: true, key: 'soporte' })
  })
  it('duplicate label → error', () => {
    expect(validateNewRole('Administrador', EXISTING).ok).toBe(false)
  })
  it('reserved key → error', () => {
    expect(validateNewRole('Todos', EXISTING).ok).toBe(false)
    expect(validateNewRole('Admin', EXISTING).ok).toBe(false)
  })
  it('duplicate key → deduped with a suffix', () => {
    const ex: RoleRow[] = [{ key: 'soporte', label: 'Soporte viejo', is_system: false }]
    const r = validateNewRole('Soporte', ex)
    expect(r.ok && r.key).toBe('soporte_2')
  })
  it('empty label → error', () => { expect(validateNewRole('  ', EXISTING).ok).toBe(false) })
})
