import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TEXT_MAX from '@/features/billing-v2/domain/text-limits'
import recordForm from '../form-state'
import fieldSpecs from '../field-specs'
import type { RecordForm } from '../types'
import RecordField from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: Record<string, string>) => (vars ? `${key}(${Object.values(vars).join()})` : key) }),
}))

const spec = (name: keyof RecordForm) => fieldSpecs('payment').filter((s) => s.name === name)[0]
const ignore = () => undefined
const draw = (name: keyof RecordForm, form: RecordForm = recordForm(null)) => renderToStaticMarkup(
  <RecordField spec={spec(name)} form={form} onEdit={ignore} />,
)

describe('RecordField', () => {
  it('names the field and marks it required when it is', () => {
    const html = draw('title')
    expect(html).toContain('billing.field.title')
    // The asterisk is drawn by the Field's stylesheet; the box says it with `aria-required`.
    expect(html).toContain('aria-required="true"')
  })

  // The payment date is the due date, not the settlement date, and the editor has to say so.
  it('carries the help line its spec asks for', () => {
    expect(draw('scheduledOn')).toContain('billing.help.scheduledOn')
  })

  // Blank and zero look alike in a box; the line under it says which one is being stored.
  it('says whether the amount is unknown or an explicit zero, however the zero is typed', () => {
    expect(draw('amount')).toContain('billing.amount.unknown')
    expect(draw('amount', { ...recordForm(null), amount: '0' })).toContain('billing.amount.zero')
    expect(draw('amount', { ...recordForm(null), amount: '0,00' })).toContain('billing.amount.zero')
  })

  // The currency is in view while typing, taken from the domain, and a phone opens a keypad.
  it('shows the amount in its currency and asks for a decimal keypad', () => {
    const html = draw('amount')
    expect(html).toContain('billing.field.amount(USD)')
    expect(html).toContain('inputMode="decimal"')
  })

  it('stops a text box at the limit of its column', () => {
    expect(draw('title')).toContain(`maxLength="${TEXT_MAX.title}"`)
    expect(draw('payeeLabel')).toContain(`maxLength="${TEXT_MAX.payeeLabel}"`)
  })

  // The message goes under its own box, and the box is marked invalid and pointed at it.
  it('draws its error under the box it belongs to, with the limit a too-long text broke', () => {
    const html = renderToStaticMarkup(
      <RecordField spec={spec('title')} form={recordForm(null)} error="billing.error.tooLong" onEdit={ignore} />,
    )
    expect(html).toContain(`billing.error.tooLong(${TEXT_MAX.title})`)
    expect(html).toContain('aria-invalid="true"')
    expect(draw('title')).not.toContain('aria-invalid')
  })
})
