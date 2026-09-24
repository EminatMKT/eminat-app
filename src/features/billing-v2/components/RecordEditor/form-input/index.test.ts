import { describe, it, expect } from 'vitest'
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
    expect(errors).toEqual([])
    expect(input).toMatchObject({ recordType: 'payment', amount: null })
  })

  // Nothing reaches the network while a field is wrong, and the person is told which field.
  it('names the field that is wrong and sends nothing', () => {
    const { input, errors } = formInput({ ...valid, title: '   ' })
    expect(input).toBeNull()
    expect(errors).toEqual(['billing.error.title'])
  })

  it('refuses an amount that is not a whole number of cents', () => {
    expect(formInput({ ...valid, amount: '1.005' }).errors).toEqual(['billing.error.amount'])
    expect(formInput({ ...valid, amount: '-3' }).errors).toEqual(['billing.error.amount'])
    expect(formInput({ ...valid, amount: '1.2300' }).errors).toEqual([])
  })

  it('refuses a day that is not on the calendar and a clock that is not on the clock', () => {
    expect(formInput({ ...valid, scheduledOn: '2026-02-30' }).errors).toEqual(['billing.error.scheduledOn'])
    expect(formInput({ ...valid, scheduledTime: '24:00' }).errors).toEqual(['billing.error.scheduledTime'])
  })

  it('reports each wrong field once, in the order the form shows them', () => {
    const { errors } = formInput({ ...valid, title: '', payeeLabel: '' })
    expect(errors).toEqual(['billing.error.title', 'billing.error.payeeLabel'])
  })

  it('asks a month note for a real first-of-month and a text', () => {
    const note: RecordForm = { ...valid, recordType: 'month_note', noteMonth: '2026-09-14', noteText: 'x' }
    expect(formInput(note).errors).toEqual(['billing.error.noteMonth'])
    expect(formInput({ ...note, noteMonth: '2026-09-01' }).errors).toEqual([])
  })
})
