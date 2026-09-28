import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import recordForm from '../form-state'
import fieldSpecs from '../field-specs'
import type { RecordForm } from '../types'
import FieldControl from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const form = recordForm(null)
const spec = (name: keyof RecordForm) => fieldSpecs('payment').filter((s) => s.name === name)[0]
const ignore = () => undefined
const draw = (name: keyof RecordForm) => renderToStaticMarkup(
  <FieldControl spec={spec(name)} form={form} onEdit={ignore} />,
)

describe('FieldControl', () => {
  it('asks the browser for a calendar day where the field is a date', () => {
    expect(draw('scheduledOn')).toContain('type="date"')
  })

  // A closed list is picked from, never typed: the stored value is the domain one.
  it('offers a closed list as its domain values, named by their labels', () => {
    const html = draw('category')
    expect(html).toContain('value="payroll"')
    expect(html).toContain('billing.category.payroll')
  })

  it('draws the marker as a switch that says whether it is on', () => {
    expect(draw('closingApprovalFollowUp')).toContain('aria-pressed="false"')
  })

  it('gives a note room to wrap', () => {
    expect(draw('noteText')).toContain('<textarea')
  })
})
