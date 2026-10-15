import { expectTypeOf, it } from 'vitest'
import type { Estado, Props } from './types'

type Item = { id: string }

it('types the three callbacks a caller must supply around its own item shape', () => {
  expectTypeOf<Props<Item>['cargarItem']>().toEqualTypeOf<(id: string) => Promise<Item>>()
  expectTypeOf<Props<Item>['renderResumen']>().toEqualTypeOf<(item: Item) => string>()
})

it('keeps the open pair unloaded until both sides resolve', () => {
  expectTypeOf<Estado<Item>['itemA']>().toEqualTypeOf<Item | null>()
  expectTypeOf<Estado<Item>['itemB']>().toEqualTypeOf<Item | null>()
})
