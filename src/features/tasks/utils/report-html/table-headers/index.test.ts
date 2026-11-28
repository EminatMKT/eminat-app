import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import buildTableHeaders from './index'

const translate = (key: I18nKey) => key
const KEYS = [
  'stratix.report.colTask', 'stratix.report.colArea',
  'stratix.report.colAssignee', 'stratix.new.start',
  'tasks.report.deadline', 'stratix.report.colStatus',
]

describe('buildTableHeaders', () => {
  it('renders all six translated columns in order', () => {
    const html = buildTableHeaders(translate)
    const positions = KEYS.map(key => html.indexOf(key))

    expect(html.match(/<th /g)).toHaveLength(KEYS.length)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})
