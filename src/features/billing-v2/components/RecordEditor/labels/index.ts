import type { I18nKey } from '@/shared/i18n'

const KEYS: Record<string, I18nKey> = {
  payment: 'billing.type.payment', event: 'billing.type.event',
  month_note: 'billing.type.monthNote', payroll: 'billing.category.payroll',
  contractors_vendors: 'billing.category.contractorsVendors',
  pending: 'billing.status.pending', scheduled: 'billing.status.scheduled',
  pending_approval: 'billing.status.pendingApproval', paid: 'billing.status.paid',
}

/** The i18n key that displays a stored billing value. */
export default function billingLabelKey(value: string): I18nKey {
  return KEYS[value]
}

// The display name of a domain value, and only that. The three vocabularies of a billing record
// share one table because their members are distinct, so a value names its own key and no caller
// has to say which list it came from. What gets stored stays the canonical value from the domain.
