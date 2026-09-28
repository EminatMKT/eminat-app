import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { I18nKey } from '@/shared/i18n'
import RecordsGate from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const VIEWS = 'calendar-and-reminders'
const ignore = () => undefined
const draw = (hasRecords: boolean, loading: boolean, error: I18nKey | null = null) => renderToStaticMarkup(
  <RecordsGate hasRecords={hasRecords} loading={loading} error={error} onRetry={ignore}>{VIEWS}</RecordsGate>,
)

describe('RecordsGate', () => {
  it('says it is loading before there is anything to show', () => {
    const html = draw(false, true)
    expect(html).toContain('common.loading')
    expect(html).not.toContain(VIEWS)
  })

  // A refresh after a write keeps the views on screen instead of blinking them away.
  it('keeps the views on screen while the records are read again', () => {
    expect(draw(true, true)).toContain(VIEWS)
  })

  // A failed read is not an empty calendar: it says so and offers to try again.
  it('tells a failed read apart from an empty one', () => {
    const failed = draw(false, false, 'billing.loadFailed')
    expect(failed).toContain('billing.loadFailed')
    expect(failed).toContain('common.retry')
    expect(failed).not.toContain(VIEWS)
  })

  // No records is a real answer: the calendar and both empty reminder groups say it themselves.
  it('shows the views when the read succeeded with nothing stored', () => {
    expect(draw(false, false)).toContain(VIEWS)
  })
})
