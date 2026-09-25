import { describe, expectTypeOf, it } from 'vitest'
import type { catalogoMeta } from '@/shared/utils'
import type { Catalog, Creating, Editing } from '../types'

type Status = 'open' | 'closed'

describe('CatalogoSelect types', () => {
  it('accepts what catalogoMeta returns, without a cast at the call site', () => {
    expectTypeOf<ReturnType<typeof catalogoMeta<Status>>>().toMatchTypeOf<Catalog<Status>>()
  })

  it('hands the change back as the catalog union, not as a DOM string', () => {
    expectTypeOf<Editing<Status>['onChange']>().parameter(0).toEqualTypeOf<Status>()
    expectTypeOf<Editing<Status>['valor']>().toEqualTypeOf<Status>()
  })

  // Only a select that draws the blank choice can hand it back, and its type says so.
  it('adds the blank choice to the union only when there is a placeholder', () => {
    expectTypeOf<Creating<Status>['onChange']>().parameter(0).toEqualTypeOf<Status | ''>()
    expectTypeOf<Creating<Status>['placeholder']>().toEqualTypeOf<string>()
  })
})

// Checked by `tsc`, not at run time: a catalog that stops fitting the select breaks the build.
