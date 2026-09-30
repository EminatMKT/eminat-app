import { distinctValues, type FilterDef } from '@/shared/utils'
import type { BillingV2Record } from '@/shared/data'

const payeeDef: FilterDef<BillingV2Record> = {
  key: 'payee_label',
  labelKey: 'billing.filter.allPayees',
  nameKey: 'billing.field.payeeLabel',
  options: items => distinctValues(items, r => r.payee_label),
  match: (r, v) => r.payee_label === v,
}

export default payeeDef

// The module exports the payee filter definition for Billing summary records.
