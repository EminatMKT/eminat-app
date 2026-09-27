import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import formInput from '@/features/billing-v2/components/RecordEditor/form-input'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'
import saveBlock from './index'

/** Echoes the key and the fields it lists, so the test reads which reason and which boxes. */
const t = (key: I18nKey, vars?: Record<string, string | number>) =>
  [key, vars?.fields, vars?.missing, vars?.invalid].filter(Boolean).join('|')
/** The reason for a form, judged by the same schema the field messages come from. */
const held = (form: RecordForm, initial: RecordForm) => saveBlock(form, initial, formInput(form).errors, t)
const blank = recordForm(null)
const stored = recordForm(fixtureRecord({ id: 'r1', payee_label: 'x' }))
const filled = { ...blank, scheduledOn: '2026-09-30', title: 'x', category: 'payroll', payeeLabel: 'y' }

describe('saveBlock', () => {
  // The reason is in view beside the button, and it names every box still missing.
  it('holds Save back while a required field is empty, naming each one', () => {
    expect(held(blank, blank)).toBe(
      'billing.saveBlocked.missing|billing.field.scheduledOn, billing.field.title, billing.field.category, billing.field.payeeLabel',
    )
  })

  it('names only what is still missing once part of it is filled in', () => {
    const typed = { ...blank, scheduledOn: '2026-09-30', title: 'x', category: 'payroll' }
    expect(held(typed, blank)).toBe('billing.saveBlocked.missing|billing.field.payeeLabel')
  })

  // A value the schema refuses holds Save as firmly as an empty one, and the reason names the box.
  it('holds Save back while a field holds a value the schema refuses, naming it', () => {
    expect(held({ ...filled, amount: 'abc' }, blank)).toBe('billing.saveBlocked.invalid|billing.field.amount')
    expect(held({ ...stored, amount: '150.-' }, stored)).toBe('billing.saveBlocked.invalid|billing.field.amount')
  })

  // One reason, never two competing: what is missing and what is wrong are said in one line.
  it('names what is missing and what is wrong in a single reason', () => {
    expect(held({ ...blank, title: 'x', amount: '-5' }, blank)).toBe(
      'billing.saveBlocked.both|billing.field.scheduledOn, billing.field.category, billing.field.payeeLabel|billing.field.amount',
    )
  })

  // A stored record opened and left alone has nothing to save.
  it('holds Save back while the form equals the stored record', () => {
    expect(held(stored, stored)).toBe('billing.saveBlocked.unchanged')
  })

  it('lets Save through once something changed and nothing is missing or wrong', () => {
    expect(held({ ...stored, amount: '12' }, stored)).toBeNull()
    expect(held({ ...filled, amount: '$150' }, blank)).toBeNull()
    expect(held(filled, blank)).toBeNull()
  })

  it('asks a month note for its own required fields, not a payment\'s', () => {
    const note = { ...blank, recordType: 'month_note' as const }
    expect(held(note, blank)).toBe('billing.saveBlocked.missing|billing.field.noteMonth, billing.field.noteText')
  })
})
