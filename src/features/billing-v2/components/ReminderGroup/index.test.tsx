import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import ReminderGroup from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const TITLE = 'Overdue'
const EMPTY = 'No overdue payments.'
const payment = fixtureRecord({ scheduled_on: '2026-09-01' })
const draw = (records: BillingV2Record[]) =>
  renderToStaticMarkup(<ReminderGroup title={TITLE} empty={EMPTY} records={records} onOpen={() => undefined} />)

describe('ReminderGroup', () => {
  it('names the group with a heading and lists its payments', () => {
    const html = draw([payment])
    expect(html).toContain('<h3')
    expect(html).toContain(TITLE)
    expect(html).toContain(payment.title)
    expect(html).not.toContain(EMPTY)
  })

  // An empty Overdue is information, so the group stays on screen and says it is empty.
  it('keeps an empty group on screen and says so', () => {
    const html = draw([])
    expect(html).toContain(TITLE)
    expect(html).toContain(EMPTY)
  })
})
