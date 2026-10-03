import { describe, it, expectTypeOf } from 'vitest'
import type { Result, Validation, Validate } from './types'

describe('http types', () => {
  it('a result carries an optional catalog key and message next to its data', () => {
    expectTypeOf<Result<number>['data']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Result<number>['error']>().toEqualTypeOf<string | undefined>()
  })
  it('a contract maps an unknown body to a validation of its input', () => {
    expectTypeOf<ReturnType<Validate<string>>>().toEqualTypeOf<Validation<string>>()
  })
})
