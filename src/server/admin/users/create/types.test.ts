import { describe, it, expectTypeOf } from 'vitest'
import type { CreateUserInput, CreatedUser } from './types'

describe('create-user types', () => {
  it('the catalogs and cargos are optional in the input', () => {
    expectTypeOf<CreateUserInput>().toHaveProperty('cargoIds').toEqualTypeOf<string[] | undefined>()
    expectTypeOf<CreateUserInput>().toHaveProperty('password').toEqualTypeOf<string>()
  })
  it('the created answer carries the email warning next to the row', () => {
    expectTypeOf<CreatedUser>().toHaveProperty('emailWarning').toEqualTypeOf<string | null>()
  })
})
