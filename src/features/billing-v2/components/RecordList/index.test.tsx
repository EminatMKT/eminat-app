import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import RecordList from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const payment = { id: 'r1', record_type: 'payment', title: 'Nómina', scheduled_on: '2026-09-30', note_month: null } as BillingV2Record
const ignore = () => undefined
const draw = (records: BillingV2Record[], loading: boolean, error: I18nKey | null = null) => renderToStaticMarkup(
  <RecordList records={records} loading={loading} error={error} onRetry={ignore} onOpen={ignore} />,
)

describe('RecordList', () => {
  it('says it is loading before there is anything to show', () => {
    expect(draw([], true)).toContain('common.loading')
  })

  // A refresh after a write keeps the list on screen instead of blinking it away.
  it('keeps the records on screen while they are read again', () => {
    expect(draw([payment], true)).toContain('Nómina')
  })

  // A failed read is not an empty list: it says so and offers to try again.
  it('tells a failed read apart from an empty one', () => {
    const failed = draw([], false, 'billing.loadFailed')
    expect(failed).toContain('billing.loadFailed')
    expect(failed).toContain('common.retry')
    expect(draw([], false)).toContain('billing.empty')
  })
})
