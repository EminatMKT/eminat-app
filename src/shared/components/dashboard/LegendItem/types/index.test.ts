import { expectTypeOf, it } from 'vitest'
import type { DotStyle, Props } from './index'

it('keeps legend item props and dot style importable without the component', () => {
  expectTypeOf<Props>().toMatchTypeOf<{
    name: string
    value: number
    total: number
    color: string
    formatValue?: (v: number) => string
  }>()
  expectTypeOf<DotStyle>().toHaveProperty('--dot').toEqualTypeOf<string>()
})
