import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import formInput from '@/features/billing-v2/components/RecordEditor/form-input'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'
import saveBlock from './index'

/** Echoes the key, so the test reads which label or which hold. */
const t = (key: I18nKey) => key
const blank = recordForm(null)
const stored = recordForm(fixtureRecord({ id: 'r1', payee_label: 'x' }))
/** The fields Save's reason would call missing: empty, and refused by the schema. */
function missing(form: RecordForm) {
  const { errors } = formInput(form)
  return saveBlock(form, blank, t).fields.filter((field) => field.blank && field.name in errors).map((field) => field.label)
}

describe('saveBlock', () => {
  // The footer names the fields in the order they are drawn, by the label they are drawn under.
  it('describes every field of the record type, labelled and marked when its box is empty', () => {
    const { fields } = saveBlock({ ...blank, title: 'x' }, blank, t)
    expect(fields.map((field) => field.name)).toEqual([
      'scheduledOn', 'scheduledTime', 'title', 'category', 'paymentStatus', 'payeeLabel', 'amount',
      'closingApprovalFollowUp', 'noteText',
    ])
    const byName = new Map(fields.map((field) => [field.name, field]))
    expect(byName.get('title')).toEqual({ name: 'title', label: 'billing.field.title', blank: false })
    expect(byName.get('scheduledOn')?.blank).toBe(true)
  })

  // An empty required box is refused by the schema, so the reason asks to fill in each of them.
  it('leaves every required box of a new payment empty and refused, so each is named as missing', () => {
    expect(missing(blank)).toEqual([
      'billing.field.scheduledOn', 'billing.field.title', 'billing.field.category', 'billing.field.payeeLabel',
    ])
  })

  it('asks a month note for its own required fields, not a payment\'s', () => {
    expect(missing({ ...blank, recordType: 'month_note' })).toEqual(['billing.field.date', 'billing.field.noteText'])
  })

  // A box holding a refused value is not empty: the reason asks to fix it, not to fill it in.
  it('does not call a box holding a refused value empty', () => {
    const { fields } = saveBlock({ ...stored, amount: 'abc' }, stored, t)
    expect(new Map(fields.map((field) => [field.name, field.blank])).get('amount')).toBe(false)
  })

  // A stored record opened and left alone has nothing to save: the editor's own hold.
  it('holds Save back while the form equals the stored record, and only then', () => {
    expect(saveBlock(stored, stored, t).hold).toBe('billing.saveBlocked.unchanged')
    expect(saveBlock({ ...stored, amount: '12' }, stored, t).hold).toBeNull()
    expect(saveBlock(blank, blank, t).hold).toBe('billing.saveBlocked.unchanged')
  })
})
