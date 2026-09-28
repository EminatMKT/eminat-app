import { describe, it, expect } from 'vitest'
import TEXT_MAX from '@/features/billing-v2/domain/text-limits'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'
import formInput from './index'

const valid: RecordForm = {
  ...recordForm(null), scheduledOn: '2026-09-30', title: 'Nómina',
  category: 'payroll', payeeLabel: 'Equipo EMC',
}

describe('formInput', () => {
  it('hands back a mutation the repository can send when the form is complete', () => {
    const { input, errors } = formInput(valid)
    expect(errors).toEqual({})
    expect(input).toMatchObject({ recordType: 'payment', amount: null })
  })

  // Nothing reaches the network while a field is wrong, and each message belongs to its field.
  it('names the field that is wrong and sends nothing', () => {
    const { input, errors } = formInput({ ...valid, title: '   ' })
    expect(input).toBeNull()
    expect(errors).toEqual({ title: 'billing.error.title' })
  })

  it('refuses an amount that is not a whole number of cents, and reads a decimal comma', () => {
    expect(formInput({ ...valid, amount: '1250.405' }).errors).toEqual({ amount: 'billing.error.amount' })
    expect(formInput({ ...valid, amount: '-3' }).errors).toEqual({ amount: 'billing.error.amount' })
    expect(formInput({ ...valid, amount: '1.2300' }).errors).toEqual({})
    expect(formInput({ ...valid, amount: '1.250,40' }).input).toMatchObject({ amount: '1250.40' })
    // A single dot before exactly three digits groups thousands, as es-EC writes it.
    expect(formInput({ ...valid, amount: '1.005' }).input).toMatchObject({ amount: '1005' })
  })

  it('refuses a day that is not on the calendar and a clock that is not on the clock', () => {
    expect(formInput({ ...valid, scheduledOn: '2026-02-30' }).errors).toEqual({ scheduledOn: 'billing.error.scheduledOn' })
    expect(formInput({ ...valid, scheduledTime: '24:00' }).errors).toEqual({ scheduledTime: 'billing.error.scheduledTime' })
  })

  it('gives every wrong field its own message', () => {
    const { errors } = formInput({ ...valid, title: '', payeeLabel: '' })
    expect(errors).toEqual({ title: 'billing.error.title', payeeLabel: 'billing.error.payeeLabel' })
  })

  // Too long is a different fix from empty, so it says so instead of the field's usual message.
  it('says a text is too long rather than that it is missing', () => {
    const errors = formInput({ ...valid, title: 'x'.repeat(TEXT_MAX.title + 1) }).errors
    expect(errors).toEqual({ title: 'billing.error.tooLong' })
  })

  it('asks a month note for a real day —any day of its month— and a text', () => {
    const note: RecordForm = { ...valid, recordType: 'month_note', noteMonth: '2026-09-31', noteText: 'x' }
    expect(formInput(note).errors).toEqual({ noteMonth: 'billing.error.noteMonth' })
    expect(formInput({ ...note, noteMonth: '2026-09-14' }).errors).toEqual({})
  })
})
