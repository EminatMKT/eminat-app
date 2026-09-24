import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import RecordItem from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const payment = { id: 'r1', record_type: 'payment', title: 'Nómina', scheduled_on: '2026-09-30', note_month: null } as BillingV2Record
const note = { id: 'r2', record_type: 'month_note', title: null, scheduled_on: null, note_month: '2026-09-01' } as BillingV2Record
const ignore = () => undefined

describe('RecordItem', () => {
  it('shows the concept and its date', () => {
    const html = renderToStaticMarkup(<RecordItem record={payment} onOpen={ignore} />)
    expect(html).toContain('Nómina')
    expect(html).toContain('2026-09-30')
  })

  // A month note has no concept: it is named by its kind and dated by its month.
  it('names a month note by its kind and its month', () => {
    const html = renderToStaticMarkup(<RecordItem record={note} onOpen={ignore} />)
    expect(html).toContain('billing.type.monthNote')
    expect(html).toContain('2026-09-01')
  })

  it('opens the record it shows', () => {
    const opened: BillingV2Record[] = []
    const box = RecordItem({ record: payment, onOpen: (r) => { opened.push(r) } })
    box.props.onClick()
    expect(opened).toEqual([payment])
  })
})
