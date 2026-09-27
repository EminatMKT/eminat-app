import { expect, it } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import type { RecordViewProps } from './index'

const record = fixtureRecord({ id: 'r1' })
const opened: BillingV2Record[] = []
const props: RecordViewProps = { records: [record], today: '2026-09-23', onOpen: (one) => { opened.push(one) } }

it('carries the records, the business day and the way back to the editor', () => {
  props.onOpen(props.records[0])
  expect(opened).toEqual([record])
  expect(Object.keys(props).sort()).toEqual(['onOpen', 'records', 'today'])
})
