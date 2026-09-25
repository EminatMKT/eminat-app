import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import saveBlock from './index'

/** Echoes the key and the fields it lists, so the test reads which reason and which boxes. */
const t = (key: I18nKey, vars?: Record<string, string | number>) => (vars?.fields ? `${key}|${vars.fields}` : key)
const blank = recordForm(null)
const stored = recordForm(fixtureRecord({ id: 'r1', payee_label: 'x' }))

describe('saveBlock', () => {
  // The reason is in view beside the button, and it names every box still missing.
  it('holds Save back while a required field is empty, naming each one', () => {
    expect(saveBlock(blank, blank, t)).toBe(
      'billing.saveBlocked.missing|billing.field.scheduledOn, billing.field.title, billing.field.category, billing.field.payeeLabel',
    )
  })

  it('names only what is still missing once part of it is filled in', () => {
    const typed = { ...blank, scheduledOn: '2026-09-30', title: 'x', category: 'payroll' }
    expect(saveBlock(typed, blank, t)).toBe('billing.saveBlocked.missing|billing.field.payeeLabel')
  })

  // A stored record opened and left alone has nothing to save.
  it('holds Save back while the form equals the stored record', () => {
    expect(saveBlock(stored, stored, t)).toBe('billing.saveBlocked.unchanged')
  })

  it('lets Save through once something changed and nothing required is missing', () => {
    expect(saveBlock({ ...stored, amount: '12' }, stored, t)).toBeNull()
    const typed = { ...blank, scheduledOn: '2026-09-30', title: 'x', category: 'payroll', payeeLabel: 'y' }
    expect(saveBlock(typed, blank, t)).toBeNull()
  })

  it('asks a month note for its own required fields, not a payment\'s', () => {
    const note = { ...blank, recordType: 'month_note' as const }
    expect(saveBlock(note, blank, t)).toBe('billing.saveBlocked.missing|billing.field.noteMonth, billing.field.noteText')
  })
})
