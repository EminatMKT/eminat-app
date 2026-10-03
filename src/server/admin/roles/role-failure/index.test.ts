import { describe, expect, it } from 'vitest'
import roleFailure from '.'

describe('roleFailure', () => {
  it('a duplicate key or label is a 400 the admin can act on', () => {
    expect(roleFailure({ code: '23505', message: 'duplicate key' })).toEqual({ status: 400, error: 'A role with that key or label already exists.' })
  })

  it('editing the modules of a system role is refused', () => {
    expect(roleFailure({ code: '22023', message: 'rol_de_sistema' })).toEqual({ status: 400, error: 'System role modules cannot be edited.' })
  })

  it('a missing role is a 404', () => {
    expect(roleFailure({ code: 'P0002', message: 'rol_inexistente' })).toEqual({ status: 404, error: 'Role not found.' })
  })

  it('anything else passes the database message through as a 400', () => {
    expect(roleFailure({ code: 'XX000', message: 'boom' })).toEqual({ status: 400, error: 'boom' })
  })
})
