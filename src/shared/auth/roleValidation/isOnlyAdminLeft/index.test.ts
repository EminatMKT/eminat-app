import { describe, it, expect } from 'vitest'
import isOnlyAdminLeft from './index'

const ADMIN_A = { id: 'a', rol: 'admin' }
const ADMIN_B = { id: 'b', rol: 'admin' }
const MEMBER = { id: 'm', rol: 'sin_asignar' }

describe('isOnlyAdminLeft', () => {
  it('the only admin is the last one', () => { expect(isOnlyAdminLeft([ADMIN_A, MEMBER], 'a')).toBe(true) })
  it('one of two admins is not the last one', () => { expect(isOnlyAdminLeft([ADMIN_A, ADMIN_B], 'a')).toBe(false) })
  it('a non-admin target never is', () => { expect(isOnlyAdminLeft([ADMIN_A, MEMBER], 'm')).toBe(false) })
  it('no admins at all → false', () => { expect(isOnlyAdminLeft([MEMBER], 'm')).toBe(false) })
})
