import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FieldLabel from './index'

// Fixtures, not shipped copy.
const TEXT = 'Amount'
const ICON = '💵'
const TARGET = 'amount'

describe('FieldLabel', () => {
  it('points at the control it names', () => {
    const html = renderToStaticMarkup(<FieldLabel htmlFor={TARGET} label={TEXT} />)
    expect(html).toContain(`for="${TARGET}"`)
    expect(html).toContain(TEXT)
  })

  // The emoji decorates; read aloud it would become part of the field's name.
  it('keeps the icon out of the name', () => {
    const html = renderToStaticMarkup(<FieldLabel htmlFor={TARGET} label={TEXT} icon={ICON} />)
    expect(html).toContain(`aria-hidden="true">${ICON}`)
  })

  it('marks a required field so the asterisk is drawn', () => {
    const html = renderToStaticMarkup(<FieldLabel htmlFor={TARGET} label={TEXT} required />)
    expect(html).toContain('data-required="true"')
  })
})
