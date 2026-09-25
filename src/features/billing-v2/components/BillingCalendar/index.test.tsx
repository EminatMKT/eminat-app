import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import type { CalendarView } from '@/shared/components/views'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import BillingCalendar from './index'

type Drawn = Parameters<typeof CalendarView>[0]
const view: { props: Drawn | null } = { props: null }

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: object) => `${key}${vars ? JSON.stringify(vars) : ''}`, intlLocale: 'en-US' }),
}))
vi.mock('@/shared/components/views', () => ({
  CalendarView: (props: Drawn) => { view.props = props; return null },
}))

const NOTE = 'Books close on the 28th'
const payment = fixtureRecord({ id: 'pay', payment_status: 'paid' })
const note = fixtureRecord({
  id: 'note', record_type: 'month_note', scheduled_on: null, note_month: '2026-09-01', note_text: NOTE,
  title: null, category: null, payment_status: null, currency_code: null,
})
const opened: BillingV2Record[] = []
const newOn: string[] = []
const draw = (records: BillingV2Record[]) => renderToStaticMarkup(
  <BillingCalendar records={records} today="2026-09-23" onOpen={(one) => opened.push(one)} onNewOn={(day) => newOn.push(day)} />,
)

describe('BillingCalendar', () => {
  beforeEach(() => { opened.length = 0; newOn.length = 0; view.props = null })

  it('opens a month page on the month of the business day', () => {
    draw([])
    expect(view.props?.period).toBe('2026-09-01')
    expect(view.props?.mode).toBe('month')
  })

  // Paid payments leave the reminders, never the calendar.
  it('places paid payments on their day', () => {
    draw([payment])
    expect(view.props?.items.map(({ id, date }) => ({ id, date }))).toEqual([{ id: 'pay', date: '2026-09-30' }])
  })

  it('turns the id the calendar answers with back into the record to open', () => {
    draw([payment])
    view.props?.onItemSelect('pay')
    expect(opened).toEqual([payment])
  })

  it('offers a new record on the day that was pressed', () => {
    draw([])
    view.props?.onDaySelect('2026-09-14')
    expect(newOn).toEqual(['2026-09-14'])
  })

  it('says how many records a full day hides, in the words of the screen', () => {
    draw([])
    expect(view.props?.moreLabel(3)).toBe('billing.calendar.more{"count":3}')
    expect(view.props?.lessLabel).toBe('billing.calendar.less')
  })

  it('draws the note of the month above the grid instead of on a day', () => {
    expect(draw([note])).toContain(NOTE)
    expect(view.props?.items).toEqual([])
  })
})
