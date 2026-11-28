import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import emptyNotice from './index'

const EMPTY: Actividad[] = []
const TASKS: Actividad[] = [{ titulo: 'Task' }]
const translate = (key: I18nKey) => key
const EMPTY_KEY = 'stratix.report.empty'
const EMPTY_HTML = ''

describe('emptyNotice', () => {
  it('renders the translated empty state only when there are no tasks', () => {
    expect(emptyNotice(EMPTY, translate)).toContain(EMPTY_KEY)
    expect(emptyNotice(TASKS, translate)).toBe(EMPTY_HTML)
  })
})
