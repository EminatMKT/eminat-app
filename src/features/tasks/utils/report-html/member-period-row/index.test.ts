import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import buildMemberPeriodRow from './index'

const MEMBER = 'Ada'
const PERIOD = 'August 2026'
const PRINT_CLASS = 'class="no-print"'
const PRINT_CALL = 'window.print()'
const PRINT_KEY = 'common.print'
const RAW_NAME = '<Ada>'
const ESCAPED_NAME = '&lt;Ada&gt;'
const translate = (key: I18nKey) => key

describe('buildMemberPeriodRow', () => {
  it('renders member, print control, and formatted period labels', () => {
    const html = buildMemberPeriodRow(MEMBER, PERIOD, translate)
    expect(html).toContain(MEMBER)
    expect(html).toContain(PRINT_CLASS)
    expect(html).toContain(PRINT_CALL)
    expect(html).toContain(PERIOD)
    expect(html).toContain(PRINT_KEY)
  })

  it('escapes the member name', () => {
    const html = buildMemberPeriodRow(RAW_NAME, PERIOD, translate)
    expect(html).toContain(ESCAPED_NAME)
  })
})
