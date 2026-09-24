import { describe, it, expect } from 'vitest'
import es from '@/shared/i18n/locales/es.json'
import en from '@/shared/i18n/locales/en.json'
import values from '@/features/billing-v2/domain/record-values'
import fieldSpecs from './index'

const names = (kind: 'payment' | 'event' | 'month_note') => fieldSpecs(kind).map((spec) => spec.name)
const byName = (kind: 'payment' | 'event' | 'month_note') =>
  Object.fromEntries(fieldSpecs(kind).map((spec) => [spec.name, spec]))
const MONEY = ['category', 'paymentStatus', 'payeeLabel', 'amount', 'closingApprovalFollowUp']

describe('fieldSpecs', () => {
  it('gives a payment its day, its concept and the money half', () => {
    expect(names('payment')).toEqual([
      'scheduledOn', 'scheduledTime', 'title', 'category', 'paymentStatus',
      'payeeLabel', 'amount', 'closingApprovalFollowUp', 'noteText',
    ])
  })

  // The subtype check refuses these columns on an event, so the editor must not offer them.
  it('keeps every money field away from an event and from a month note', () => {
    MONEY.forEach((field) => expect(names('event')).not.toContain(field))
    MONEY.forEach((field) => expect(names('month_note')).not.toContain(field))
  })

  it('asks a month note for the month and the note, and for nothing else', () => {
    expect(names('month_note')).toEqual(['noteMonth', 'noteText'])
  })

  it('takes each closed list of options from the domain, never from a copy', () => {
    const fields = byName('payment')
    expect(fields.category?.options).toEqual(values.category.options)
    expect(fields.paymentStatus?.options).toEqual(values.paymentStatus.options)
  })

  it('says on the date field that it is the due date, not the day it was settled', () => {
    expect(byName('payment').scheduledOn?.hintKey).toBe('billing.help.scheduledOn')
  })

  // The marker sends nothing and schedules nothing; its help text has to say only that.
  it('carries help text for the closing-approval marker', () => {
    expect(byName('payment').closingApprovalFollowUp?.hintKey).toBe('billing.help.followUp')
  })

  it('names only keys both dictionaries carry', () => {
    const all = [...fieldSpecs('payment'), ...fieldSpecs('event'), ...fieldSpecs('month_note')]
    const keys = all.flatMap((spec) => [spec.labelKey, spec.hintKey].filter(Boolean))
    keys.forEach((key) => {
      expect(Object.keys(es)).toContain(key)
      expect(Object.keys(en)).toContain(key)
    })
  })
})
