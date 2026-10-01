import { expectTypeOf, it } from 'vitest'
import type { I18nKey, Locale } from '../types'

it('keeps locale and dictionary keys constrained at compile time', () => {
  expectTypeOf<Locale>().toEqualTypeOf<'es' | 'en'>()
  expectTypeOf<'common.duplicate'>().toExtend<I18nKey>()
})
