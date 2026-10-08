import { expectTypeOf, it } from 'vitest'
import type { ChartCounts, Props } from './types'

it('narrows the aggregate to just the fields the charts read', () => {
  expectTypeOf<ChartCounts>().toHaveProperty('gender')
  expectTypeOf<ChartCounts>().toHaveProperty('ageBuckets')
  expectTypeOf<ChartCounts>().toHaveProperty('areaCodes')
})

it('wraps the chart counts as the component prop', () => {
  expectTypeOf<Props>().toHaveProperty('counts').toEqualTypeOf<ChartCounts>()
})
