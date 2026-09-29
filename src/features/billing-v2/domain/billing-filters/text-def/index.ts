import type { FilterDef } from '@/shared/utils'
import type { BillingV2Record } from '@/shared/data'
import matchesText from '../text-search'

const textDef: FilterDef<BillingV2Record> = {
  key: 'text',
  labelKey: 'billing.filter.searchText',
  nameKey: 'billing.filter.searchText',
  kind: 'text',
  match: matchesText,
}

export default textDef

// The module exports the free-text search filter definition for Billing summary records.
