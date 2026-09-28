import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import type CardField from '@/features/billing-v2/components/CardField'
import type RecordButton from '@/features/billing-v2/components/RecordButton'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import ReminderItem from './index'

// The card's two pieces are replaced by recorders: each keeps the props it was drawn with and
// draws its children, so a test reads which field went into which slot without a DOM.
const { fields, surfaces } = vi.hoisted(() => ({
  fields: new Array<ComponentProps<typeof CardField>>(),
  surfaces: new Array<ComponentProps<typeof RecordButton>>(),
}))
vi.mock('@/features/billing-v2/components/CardField', () => ({
  default: (props: ComponentProps<typeof CardField>) => { fields.push(props); return props.children },
}))
vi.mock('@/features/billing-v2/components/RecordButton', () => ({
  default: (props: ComponentProps<typeof RecordButton>) => { surfaces.push(props); return props.children },
}))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: object) => `${key}${vars ? JSON.stringify(vars) : ''}`, intlLocale: 'en-US' }),
}))

const payment = fixtureRecord({ payee_label: 'Acme Ltd' })
const opened: BillingV2Record[] = []
const open = (record: BillingV2Record) => { opened.push(record) }
const draw = (record: BillingV2Record) => renderToStaticMarkup(<ReminderItem record={record} onOpen={open} />)
const slotsOf = (record: BillingV2Record) => {
  fields.length = 0
  draw(record)
  const pairs = fields.map(({ slot, children }) => [slot, children])
  return Object.fromEntries(pairs)
}

describe('ReminderItem', () => {
  beforeEach(() => { fields.length = 0; surfaces.length = 0; opened.length = 0 })

  // Every card lays its fields out the same way, each in its own slot, instead of one line
  // joined with dots that wrapped in a different place on every row.
  it('puts the date, concept, payee, amount and status each in its own slot', () => {
    const slots = slotsOf(payment)
    expect(slots).toMatchObject({
      date: 'Sep 30, 2026', concept: payment.title, payee: payment.payee_label,
      amount: 'billing.amount.missing', status: 'billing.status.pending',
    })
  })

  // An unknown amount is named as unknown on the reminder, never drawn as a zero.
  it('says the amount is unknown when it is', () => {
    expect(draw(payment)).not.toContain('$0.00')
  })

  it('shows the closing approval marker only when it is set', () => {
    expect(slotsOf(payment)).not.toHaveProperty('marker')
    const marked = fixtureRecord({ closing_approval_follow_up: true })
    expect(slotsOf(marked)).toHaveProperty('marker', 'billing.field.followUp')
  })

  // The screen reader hears the whole payment, since the card's name replaces what it draws.
  it('names the whole payment for a screen reader, and opens it on a press', () => {
    draw(payment)
    const [card] = surfaces
    expect(card.look).toBe('card')
    expect(card.accessibleLabel).toContain('billing.reminders.cardAria')
    expect(card.accessibleLabel).toContain(payment.payee_label)
    card.onPress()
    expect(opened).toEqual([payment])
  })
})
