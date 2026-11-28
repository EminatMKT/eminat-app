import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import reportFooter from './index'

const TODAY = new Date(2027, 0, 15)
const DATE_LABEL = 'January 15, 2027'
const BRAND_KEY = 'tasks.report.brand'
const translate = (key: I18nKey) => key

describe('reportFooter', () => {
  it('shows the print date and translated report brand', () => {
    const html = reportFooter(TODAY, translate)

    expect(html).toContain(DATE_LABEL)
    expect(html).toContain(BRAND_KEY)
  })
})
