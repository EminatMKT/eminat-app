import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import RecordEditor from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const stored = {
  id: 'r1', record_type: 'event', scheduled_on: '2026-09-30', scheduled_time: null,
  note_month: null, title: 'Cierre', category: null, payment_status: null, payee_label: null,
  amount: null, currency_code: null, event_type_label: null, note_text: null,
  closing_approval_follow_up: false,
} as BillingV2Record
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

  it('opens a stored record with only its own fields, its type fixed and deletable', () => {
    const html = draw(stored)
    expect(html).toContain('billing.editorEdit')
    expect(html).toContain('billing.field.eventTypeLabel')
    expect(html).not.toContain('billing.field.payeeLabel')
    expect(html).toContain('billing.typeLocked')
    expect(html).toContain('common.delete')
  })
})
