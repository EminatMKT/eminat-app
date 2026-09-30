import { expect, it } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import type { OpenEditor, Props } from './index'

it('carries the record the editor opens on, or a day for a new one', () => {
  const record: BillingV2Record = fixtureRecord({ id: 'r1' })
  const opening: OpenEditor = { record, day: '2026-09-23' }
  expect(opening.record).toBe(record)
  expect(opening.day).toBe('2026-09-23')
})

it('carries which sub-view is open', () => {
  const props: Props = { tab: 'overview' }
  expect(props.tab).toBe('overview')
})
