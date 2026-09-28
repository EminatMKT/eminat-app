import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FieldFrame from './index'

// Fixtures, not shipped copy.
const CONTROL = 'the control'
const ERROR = 'Pick a date'
const ERROR_ID = 'due-error'

describe('FieldFrame', () => {
  it('draws the error under what it holds, with the id the control is described by', () => {
    const html = renderToStaticMarkup(<FieldFrame errorId={ERROR_ID} error={ERROR}>{CONTROL}</FieldFrame>)
    expect(html.indexOf(CONTROL)).toBeLessThan(html.indexOf(ERROR))
    expect(html).toContain(`id="${ERROR_ID}"`)
  })

  it('draws no error box while there is no error', () => {
    const html = renderToStaticMarkup(<FieldFrame errorId={ERROR_ID}>{CONTROL}</FieldFrame>)
    expect(html).not.toContain(ERROR_ID)
  })
})
