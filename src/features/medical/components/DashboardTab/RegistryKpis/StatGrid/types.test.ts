import { expectTypeOf, it } from 'vitest'
import type { Stat, Props } from './types'

it('reads a stat as the fields a StatCard needs', () => {
  expectTypeOf<Stat>().toHaveProperty('label').toEqualTypeOf<string>()
  expectTypeOf<Stat>().toHaveProperty('color').toEqualTypeOf<string>()
})

it('wraps the stat list with the grid class it renders into', () => {
  expectTypeOf<Props>().toHaveProperty('stats').toEqualTypeOf<Stat[]>()
  expectTypeOf<Props>().toHaveProperty('className').toEqualTypeOf<string>()
})
