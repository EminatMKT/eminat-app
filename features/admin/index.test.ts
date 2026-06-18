import { describe, it, expect } from 'vitest'
import * as admin from './index'
import { generateTempPassword } from './password'
import { eligibleHeirs, STRATIX360_CROSS_ROLE_HEIR_EMAILS } from './heirs'

describe('features/admin API pública', () => {
  it('expone AdminModule', () => {
    expect(admin.AdminModule).toBeDefined()
  })
  it('declara su access admin-only', () => {
    expect(admin.access).toEqual({ module: 'admin', adminOnly: true })
  })
})

describe('generateTempPassword', () => {
  it('respeta el largo y excluye caracteres ambiguos (0 O 1 l I)', () => {
    const pwd = generateTempPassword(14)
    expect(pwd).toHaveLength(14)
    expect(pwd).not.toMatch(/[0O1lI]/)
  })
})

describe('eligibleHeirs', () => {
  const target = { id: 't', rol: 'stratix360', activo: true } as any
  it('incluye activos del mismo rol y excluye al propio target e inactivos', () => {
    const users = [
      target,
      { id: 'a', rol: 'stratix360', activo: true, nombre: 'Ana', responsable_ref: 'r1' },
      { id: 'b', rol: 'stratix360', activo: false, nombre: 'Beto' },
      { id: 'c', rol: 'medical', activo: true, nombre: 'Caro' },
    ] as any
    const ids = eligibleHeirs(users, target).map(u => u.id)
    expect(ids).toContain('a')
    expect(ids).not.toContain('t')
    expect(ids).not.toContain('b')
    expect(ids).not.toContain('c')
  })
  it('aplica la excepción cross-rol de Stratix 360 por email', () => {
    const freddyEmail = Array.from(STRATIX360_CROSS_ROLE_HEIR_EMAILS)[0]
    const users = [target, { id: 'f', rol: 'admin', activo: true, nombre: 'Freddy', email: freddyEmail, responsable_ref: 'rf' }] as any
    expect(eligibleHeirs(users, target).map(u => u.id)).toContain('f')
  })
})
