import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { it, expect } from 'vitest'
import billingRecordInput from '../record-input'
import TEXT_MAX from './index'

type LimitedField = keyof typeof TEXT_MAX

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations')
const LENGTH_CHECK = /char_length\((\w+)\)\s*<=\s*(\d+)/g
const COLUMN: Record<LimitedField, string> = {
  title: 'title', payeeLabel: 'payee_label', eventTypeLabel: 'event_type_label', noteText: 'note_text',
}

const isLimited = (name: string): name is LimitedField => name in TEXT_MAX

/** Every `char_length(col) <= n` the billing migrations declare, the latest one winning. */
function sqlLimits(): Map<string, number> {
  const limits = new Map<string, number>()
  const files = readdirSync(MIGRATIONS).filter((name) => name.includes('billing_v2')).sort()
  for (const name of files) {
    const sql = readFileSync(join(MIGRATIONS, name), 'utf8')
    for (const [, column, max] of Array.from(sql.matchAll(LENGTH_CHECK))) limits.set(column, Number(max))
  }
  return limits
}

const PAYMENT = {
  recordType: 'payment', scheduledOn: '2026-10-05', scheduledTime: null, title: 'x',
  category: 'payroll', paymentStatus: 'pending', payeeLabel: 'x', amount: null, noteText: null,
  closingApprovalFollowUp: false,
}
const EVENT = { recordType: 'event', scheduledOn: '2026-10-06', scheduledTime: null, title: 'x', eventTypeLabel: null, noteText: null }
const past = (max: number) => 'x'.repeat(max + 1)
const accepts = (record: object) => billingRecordInput.safeParse(record).success

// Each free-text field is held to the limit of its own column, not to a shared one.
it('has the record schema refuse a text one character past its limit', () => {
  expect(accepts({ ...PAYMENT, noteText: 'x'.repeat(TEXT_MAX.noteText) })).toBe(true)
  expect(accepts({ ...PAYMENT, title: past(TEXT_MAX.title) })).toBe(false)
  expect(accepts({ ...PAYMENT, payeeLabel: past(TEXT_MAX.payeeLabel) })).toBe(false)
  expect(accepts({ ...PAYMENT, noteText: past(TEXT_MAX.noteText) })).toBe(false)
  expect(accepts({ ...EVENT, eventTypeLabel: past(TEXT_MAX.eventTypeLabel) })).toBe(false)
})

// The SQL literal is the one copy a migration cannot avoid; this is what keeps it equal.
it('declares in the database the same limit the schema and the inputs read', () => {
  const limits = sqlLimits()
  const fields = Object.keys(COLUMN).filter(isLimited)
  expect(fields).toHaveLength(Object.keys(TEXT_MAX).length)
  for (const field of fields) expect(limits.get(COLUMN[field]), COLUMN[field]).toBe(TEXT_MAX[field])
})
