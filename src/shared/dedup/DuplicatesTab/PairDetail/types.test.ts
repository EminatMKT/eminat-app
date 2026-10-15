import { expectTypeOf, it } from 'vitest'
import type { Props } from './types'

type Item = { id: string }

it('types the merge-choice callback the caller\'s comparison grid receives', () => {
  expectTypeOf<Props<Item>['onElegir']>().toEqualTypeOf<(campo: string, valor: string) => void>()
})

it('types the two loaded items the same as the entity', () => {
  expectTypeOf<Props<Item>['itemA']>().toEqualTypeOf<Item>()
  expectTypeOf<Props<Item>['itemB']>().toEqualTypeOf<Item>()
})
