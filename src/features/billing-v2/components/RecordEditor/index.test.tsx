import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import RecordEditor from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const SAVE = 'billing.save'
const DISABLED_SAVE = new RegExp(`<button[^>]*disabled[^>]*>${SAVE}`)
const stored = fixtureRecord({ id: 'r1', record_type: 'event', category: null, payment_status: null, currency_code: null })
const landed = async () => true
const ignore = () => undefined
const draw = (record: BillingV2Record | null) => renderToStaticMarkup(
  <RecordEditor record={record} onSave={landed} onDrop={landed} onClose={ignore} />,
)

describe('RecordEditor', () => {
  // A new record opens as a payment, with every payment field and the choice of kind.
  it('opens a new record as a payment, its type still open to choose', () => {
    const html = draw(null)
    expect(html).toContain('billing.editorNew')
    expect(html).toContain('billing.field.payeeLabel')
    expect(html).toContain('billing.typeLabel')
    expect(html).not.toContain('common.delete')
  })

  // Started from a calendar day, the new payment's date box already holds that day.
  it('opens a new record on the calendar day it was started from', () => {
    const html = renderToStaticMarkup(
      <RecordEditor record={null} day="2026-09-14" onSave={landed} onDrop={landed} onClose={ignore} />,
    )
    expect(html).toContain('value="2026-09-14"')
  })

  it('opens a stored record with only its own fields, its type fixed and deletable', () => {
    const html = draw(stored)
    expect(html).toContain('billing.editorEdit')
    expect(html).toContain('billing.field.eventTypeLabel')
    expect(html).not.toContain('billing.field.payeeLabel')
    expect(html).toContain('billing.typeLocked')
    expect(html).toContain('common.delete')
  })

  // An empty form says why it cannot be saved yet, beside a disabled Save, and scolds no box.
  it('holds Save back on an empty form, in view, with no box marked invalid yet', () => {
    const html = draw(null)
    expect(html).toContain('common.saveBlocked.missing')
    expect(html).toMatch(DISABLED_SAVE)
    expect(html).not.toContain('aria-invalid')
  })

  it('says a stored record opened and left alone has nothing to save', () => {
    expect(draw(stored)).toContain('billing.saveBlocked.unchanged')
  })
})
