import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import followUpDef from './index'

const translate = (key: I18nKey) => String(key)

describe('followUpDef', () => {
  it('filters the follow-up marker', () => {
    expect(followUpDef(translate).key).toBe('closing_approval_follow_up')
  })
})
