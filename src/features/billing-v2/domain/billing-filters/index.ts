import { enRango, type FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import extraDefs from './extra-defs'

type Deps = { t: (k: I18nKey) => string }

/** The Overview tab's own filters: when a payment is due, what it's for, and how far along it
 *  is. Declared once so the bar, the predicate and the clear can't drift apart. */
export default function billingFilters({ t }: Deps): FilterDef<BillingV2Record>[] {
  const deps = { t }
  return [
    {
      key: 'scheduled_on',
      labelKey: 'billing.field.scheduledOn',
      nameKey: 'billing.field.scheduledOn',
      kind: 'dateRange',
      principal: true,
      match: (r, v) => enRango(v, r.scheduled_on),
    },
    {
      key: 'category',
      labelKey: 'billing.filter.allCategories',
      nameKey: 'billing.field.category',
      options: () => [...billingRecordValues.category.options],
      optionLabel: v => t(billingLabelKey(v)),
      match: (r, v) => r.category === v,
    },
    {
      key: 'payment_status',
      labelKey: 'billing.filter.allStatuses',
      nameKey: 'billing.field.paymentStatus',
      options: () => [...billingRecordValues.paymentStatus.options],
      optionLabel: v => t(billingLabelKey(v)),
      match: (r, v) => r.payment_status === v,
    },
    ...extraDefs(deps),
  ]
}

// Options are the closed vocabulary from `record-values`, not whatever the data happens to
// contain: a category with zero payments this range still belongs in the dropdown. The date
// range opens the bar — the obvious first question of a payment calendar, and the reason the
// Overview tab no longer pins itself to whichever month the Records calendar is on.
