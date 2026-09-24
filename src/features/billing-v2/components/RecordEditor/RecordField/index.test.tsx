import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import recordForm from '../form-state'
import fieldSpecs from '../field-specs'
import type { RecordForm } from '../types'
import RecordField from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const spec = (name: keyof RecordForm) => fieldSpecs('payment').filter((s) => s.name === name)[0]
const ignore = () => undefined
const draw = (name: keyof RecordForm, form: RecordForm = recordForm(null)) => renderToStaticMarkup(
  <RecordField spec={spec(name)} form={form} onEdit={ignore} />,
)

describe('RecordField', () => {
  it('names the field and marks it required when it is', () => {
    const html = draw('title')
    expect(html).toContain('billing.field.title')
    expect(html).toContain('*')
  })

  // The payment date is the due date, not the settlement date, and the editor has to say so.
  it('carries the help line its spec asks for', () => {
    expect(draw('scheduledOn')).toContain('billing.help.scheduledOn')
  })

  // Blank and zero look alike in a box; the line under it says which one is being stored.
  it('says whether the amount is unknown or an explicit zero', () => {
    expect(draw('amount')).toContain('billing.amount.unknown')
    expect(draw('amount', { ...recordForm(null), amount: '0' })).toContain('billing.amount.zero')
  })
})
