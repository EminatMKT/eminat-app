import type { BillingV2Record } from '@/shared/data'

const BASE: BillingV2Record = {
  id: 'fixture', record_type: 'payment', scheduled_on: '2026-09-30', scheduled_time: null,
  note_month: null, title: 'Payroll', category: 'payroll', payment_status: 'pending',
  payee_label: null, amount: null, currency_code: 'USD', event_type_label: null, note_text: null,
  closing_approval_follow_up: false, created_by_id: null,
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
}

/** A complete billing v2 row for tests: an unpaid payment of unknown amount, with `fields` on top. */
export default function fixtureRecord(fields: Partial<BillingV2Record> = {}): BillingV2Record {
  return { ...BASE, ...fields }
}

// The row the billing view suites build their cases from. Each suite used to spell out its own
// half-filled payment and cast it, which let a missing column slip through as `undefined` — a
// value the database never returns. This one is typed whole, so a new column fails here once.
//
// The defaults are the state the reminder and calendar rules care most about: unpaid, with an
// unknown amount that must never be drawn as a zero. A suite overrides only what it tests.
