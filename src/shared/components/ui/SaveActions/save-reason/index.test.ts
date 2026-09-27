import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import saveReason from './index'

/** Echoes the key and the fields it lists, so the test reads which reason and which boxes. */
const t = (key: I18nKey, vars?: Record<string, string | number>) =>
  [key, vars?.fields, vars?.missing, vars?.invalid].filter(Boolean).join('|')

// Fixtures, not shipped copy: the labels a form would hand in, already in words.
const FIELDS = [
  { name: 'date', label: 'Date', blank: true },
  { name: 'title', label: 'Title', blank: false },
  { name: 'amount', label: 'Amount', blank: false },
]
const WRONG = 'error.key'

describe('saveReason', () => {
  it('says nothing while no field holds an error', () => {
    expect(saveReason({}, FIELDS, t)).toBeNull()
    expect(saveReason({ title: undefined }, FIELDS, t)).toBeNull()
  })

  // A blank box with an error is missing: the reason asks to fill it in.
  it('names a blank field with an error as missing', () => {
    expect(saveReason({ date: WRONG }, FIELDS, t)).toBe('common.saveBlocked.missing|Date')
  })

  // A box that holds something the form refuses is wrong: the reason asks to fix it.
  it('names a filled field with an error as one to fix', () => {
    expect(saveReason({ amount: WRONG }, FIELDS, t)).toBe('common.saveBlocked.invalid|Amount')
  })

  // One reason, never two competing: what is missing and what is wrong go in one sentence.
  it('names what is missing and what is wrong in a single reason, in the order drawn', () => {
    expect(saveReason({ amount: WRONG, title: WRONG, date: WRONG }, FIELDS, t))
      .toBe('common.saveBlocked.both|Date|Title, Amount')
  })

  // Every error counts, even one of a field the caller forgot to describe: it is named as it is.
  it('still names an error of a field it has no label for', () => {
    expect(saveReason({ extra: WRONG }, FIELDS, t)).toBe('common.saveBlocked.invalid|extra')
  })
})
