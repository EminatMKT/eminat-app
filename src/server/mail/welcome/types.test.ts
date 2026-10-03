import { describe, it, expectTypeOf } from 'vitest'
import type { WelcomeArgs, WelcomeSender } from './types'

describe('welcome mail types', () => {
  it('the cargo line is optional, the credentials are not', () => {
    expectTypeOf<WelcomeArgs>().toHaveProperty('cargo').toEqualTypeOf<string | undefined>()
    expectTypeOf<WelcomeArgs>().toHaveProperty('password').toEqualTypeOf<string>()
  })
  it('a sender answers a warning or null', () => {
    expectTypeOf<WelcomeSender>().returns.toEqualTypeOf<Promise<string | null>>()
  })
})
