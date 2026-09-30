import type { FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import followUpOptions from '../follow-up-options'

type Translate = (key: I18nKey) => string

function followUpKey(value: string): I18nKey {
  if (value === followUpOptions.marked) return followUpOptions.markedKey
  return followUpOptions.unmarkedKey
}

export default function followUpDef(t: Translate): FilterDef<BillingV2Record> {
  const def: FilterDef<BillingV2Record> = {
    key: 'closing_approval_follow_up',
    labelKey: 'billing.filter.allFollowUp',
    nameKey: 'billing.field.followUp',
    options: () => followUpOptions.values,
    optionLabel: v => t(followUpKey(v)),
    match: (r, v) => String(r.closing_approval_follow_up) === v,
  }
  return def
}

// The module exports the follow-up filter definition for Billing summary records.
