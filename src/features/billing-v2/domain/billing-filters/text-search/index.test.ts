import { describe, expect, it } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import matchesText from './index'

describe('matchesText', () => {
  it('searches the title, payee, note, and event type', () => {
    const record = fixtureRecord({
      title: 'Payroll',
      payee_label: 'Acme',
      note_text: 'Cash note',
      event_type_label: 'Board meeting',
    })
    expect(matchesText(record, 'payroll')).toBe(true)
    expect(matchesText(record, 'acme')).toBe(true)
    expect(matchesText(record, 'cash')).toBe(true)
    expect(matchesText(record, 'board')).toBe(true)
  })
})
