import { describe, it, expectTypeOf } from 'vitest'
import type { UsersRepo, AuthCreated, UserRow } from './types'

describe('users repo types', () => {
  it('an Auth creation is flat: the new id or the failure, never a client response', () => {
    expectTypeOf<AuthCreated>().toHaveProperty('id').toEqualTypeOf<string | undefined>()
  })
  it('a row keeps catalogs optional, so a link can leave them out', () => {
    expectTypeOf<UserRow>().toHaveProperty('equipo_id').toEqualTypeOf<string | null | undefined>()
  })
  it('the role label lookup may find nothing', () => {
    expectTypeOf<UsersRepo>().toHaveProperty('roleLabel').returns.toEqualTypeOf<Promise<string | null>>()
  })
})
