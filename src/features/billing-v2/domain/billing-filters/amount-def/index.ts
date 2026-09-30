import type { FilterDef } from '@/shared/utils'
import type { BillingV2Record } from '@/shared/data'
import inAmountRange from '../amount-range'

const amountDef: FilterDef<BillingV2Record> = {
  key: 'amount',
  labelKey: 'billing.filter.amountRange',
  nameKey: 'billing.field.amountFilter',
  kind: 'text',
  match: (r, v) => inAmountRange(v, r.amount),
}

export default amountDef

// The module exports the text amount-range filter definition for Billing summary records.
