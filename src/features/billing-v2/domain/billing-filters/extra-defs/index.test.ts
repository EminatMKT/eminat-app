import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import extraDefs from './index'

const translate = (key: I18nKey) => String(key)
const deps = { t: translate }

describe('extraDefs', () => {
  it('declares the five additional billing filters once', () => {
    expect(extraDefs(deps).map(def => def.key)).toEqual([
      'payee_label',
      'amount',
      'closing_approval_follow_up',
      'record_type',
      'text',
    ])
  })
})
