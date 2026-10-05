import { expectTypeOf, it } from 'vitest'
import type { MeetError } from './types'

it('carries the status, the code Meet branches on and the message together', () => {
  expectTypeOf<MeetError>().toHaveProperty('status').toEqualTypeOf<number>()
  expectTypeOf<MeetError>().toHaveProperty('code').toEqualTypeOf<string>()
  expectTypeOf<MeetError>().toHaveProperty('message').toEqualTypeOf<string>()
})
