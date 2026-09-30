import { describe, expect, it } from 'vitest'
import { applyFilters } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingFilters from '../index'

type Values = { [key: string]: string }

const translate = (key: I18nKey) => String(key)
const deps = { t: translate }
const defs = billingFilters(deps)
const acmeData: Partial<BillingV2Record> = {
  id: 'acme',
  payee_label: 'Acme Corp',
  amount: '125.50',
  title: 'March payroll',
  note_text: 'urgent wire',
}
const betaData: Partial<BillingV2Record> = {
  id: 'beta',
  record_type: 'event',
  title: 'Planning',
  payee_label: 'Beta LLC',
  amount: '900.00',
  event_type_label: 'Board meeting',
  closing_approval_follow_up: true,
}
const noteData: Partial<BillingV2Record> = {
  id: 'note',
  record_type: 'month_note',
  title: 'April note',
  payee_label: null,
  amount: null,
  note_text: 'April cash note',
}
const rows: BillingV2Record[] = [
  fixtureRecord(acmeData),
  fixtureRecord(betaData),
  fixtureRecord(noteData),
]
const idsFor = (values: Values) =>
  applyFilters(rows, defs, values).map(row => row.id)

describe('billingFilters additional filters', () => {
  it('filters by payee, follow-up marker, and record type', () => {
    const byPayee = { payee_label: 'Acme Corp' }
    const byMarker = { closing_approval_follow_up: 'true' }
    const byType = { record_type: 'month_note' }
    expect(idsFor(byPayee)).toEqual(['acme'])
    expect(idsFor(byMarker)).toEqual(['beta'])
    expect(idsFor(byType)).toEqual(['note'])
  })

  it('filters decimal amount ranges and excludes unknown amounts', () => {
    const closedRange = { amount: '100..200' }
    const fromRange = { amount: '500..' }
    const toRange = { amount: '..130' }
    expect(idsFor(closedRange)).toEqual(['acme'])
    expect(idsFor(fromRange)).toEqual(['beta'])
    expect(idsFor(toRange)).toEqual(['acme'])
  })

  it('searches title, payee, notes, and event type text', () => {
    const byTitle = { text: 'payroll' }
    const byPayee = { text: 'beta' }
    const byNote = { text: 'cash note' }
    const byEvent = { text: 'board' }
    expect(idsFor(byTitle)).toEqual(['acme'])
    expect(idsFor(byPayee)).toEqual(['beta'])
    expect(idsFor(byNote)).toEqual(['note'])
    expect(idsFor(byEvent)).toEqual(['beta'])
  })
})
