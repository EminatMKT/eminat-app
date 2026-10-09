import { expectTypeOf, it } from 'vitest'
import type { Props, RegistryCounts } from './types'

it('narrows the aggregate to just the four fields this KPI row reads', () => {
  expectTypeOf<RegistryCounts>().toEqualTypeOf<{
    totalPatients: number
    withEmail: number
    withoutEmail: number
    birthdaysThisMonth: number
  }>()
})

it('keeps counts nullable so the row can render a loading placeholder', () => {
  expectTypeOf<Props>().toHaveProperty('counts').toEqualTypeOf<RegistryCounts | null>()
})
