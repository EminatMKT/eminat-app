import { describe, expectTypeOf, it } from 'vitest'
import type { catalogoMeta } from '@/shared/utils'
import type { Catalog, Props } from '../types'

type Status = 'open' | 'closed'

describe('CatalogoSelect types', () => {
  it('accepts what catalogoMeta returns, without a cast at the call site', () => {
    expectTypeOf<ReturnType<typeof catalogoMeta<Status>>>().toMatchTypeOf<Catalog<Status>>()
  })

  it('hands the change back as the catalog union, not as a DOM string', () => {
    expectTypeOf<Props<Status>['onChange']>().parameter(0).toEqualTypeOf<Status>()
    expectTypeOf<Props<Status>['valor']>().toEqualTypeOf<Status>()
  })
})

// Checked by `tsc`, not at run time: a catalog that stops fitting the select breaks the build.
