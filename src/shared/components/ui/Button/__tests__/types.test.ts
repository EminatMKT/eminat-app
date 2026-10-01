import { expectTypeOf, it } from 'vitest'
import type { ButtonKind, ButtonProps } from '../types'

it('supports duplication and an explicit disabled explanation', () => {
  expectTypeOf<'duplicate'>().toExtend<ButtonKind>()
  expectTypeOf<ButtonProps>().toHaveProperty('disabledReason')
  expectTypeOf<ButtonProps>().toHaveProperty('onClick')
})
