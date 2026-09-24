import { expect, it } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import type { RecordViewProps } from './index'

const record = { id: 'r1', record_type: 'payment' } as BillingV2Record
const opened: BillingV2Record[] = []
const props: RecordViewProps = { records: [record], today: '2026-09-23', onOpen: (one) => { opened.push(one) } }

it('carries the records, the business day and the way back to the editor', () => {
  props.onOpen(props.records[0])
  expect(opened).toEqual([record])
  expect(Object.keys(props).sort()).toEqual(['onOpen', 'records', 'today'])
})
