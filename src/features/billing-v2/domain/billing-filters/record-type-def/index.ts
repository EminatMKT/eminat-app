import type { FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import billingRecordValues from '@/features/billing-v2/domain/record-values'

type Translate = (key: I18nKey) => string

export default function recordTypeDef(t: Translate): FilterDef<BillingV2Record> {
  const def: FilterDef<BillingV2Record> = {
    key: 'record_type',
    labelKey: 'billing.filter.allRecordTypes',
    nameKey: 'billing.typeLabel',
    options: () => [...billingRecordValues.recordType.options],
    optionLabel: v => t(billingLabelKey(v)),
    match: (r, v) => r.record_type === v,
  }
  return def
}

// The module exports the record-type filter definition for Billing summary records.
