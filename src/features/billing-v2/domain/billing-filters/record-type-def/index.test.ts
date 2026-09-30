import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import recordTypeDef from './index'

const translate = (key: I18nKey) => String(key)

describe('recordTypeDef', () => {
  it('filters the record type', () => {
    expect(recordTypeDef(translate).key).toBe('record_type')
  })
})
