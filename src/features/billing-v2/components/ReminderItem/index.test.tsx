import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import ReminderItem from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const payment = fixtureRecord()
const draw = () => renderToStaticMarkup(<ReminderItem record={payment} onOpen={() => undefined} />)

describe('ReminderItem', () => {
  it('shows the due date and what is owed', () => {
    const html = draw()
    expect(html).toContain('Sep 30, 2026')
    expect(html).toContain(payment.title)
  })

  // An unknown amount is named as unknown on the reminder, never drawn as a zero.
  it('says the amount is unknown when it is', () => {
    const html = draw()
    expect(html).toContain('billing.amount.missing')
    expect(html).not.toContain('$0.00')
  })

  it('opens the payment it shows', () => {
    const opened: BillingV2Record[] = []
    const surface = ReminderItem({ record: payment, onOpen: (one) => { opened.push(one) } })
    surface.props.onPress()
    expect(opened).toEqual([payment])
  })
})
