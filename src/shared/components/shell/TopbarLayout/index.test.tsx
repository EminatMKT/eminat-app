import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HEADER_ELEMENT } from '@/shared/constants/dom'
import TopbarLayout from './index'

const PIECE = 'a piece of the bar'
const HINT = 'the whole list'
const HIDDEN = 'aria-hidden="true"'
const TITLE = `title="${HINT}"`

type Part = Parameters<typeof TopbarLayout>[0]['part']
const draw = (part: Part) => renderToStaticMarkup(<TopbarLayout part={part} title={HINT}>{PIECE}</TopbarLayout>)

describe('TopbarLayout', () => {
  // The bar is a landmark: assistive tech and the e2e reach it by role, not by a class name.
  it('draws the bar as a header around its content', () => {
    const html = draw('bar')
    expect(html.startsWith(`<${HEADER_ELEMENT}`)).toBe(true)
    expect(html).toContain(PIECE)
  })

  // The phone copy repeats what the wide copy says: read twice, it would be noise.
  it('hides the phone-only copy from assistive tech, and keeps its hint for the pointer', () => {
    const html = draw('narrow')
    expect(html).toContain(HIDDEN)
    expect(html).toContain(TITLE)
  })

  // The wide copy is only tucked away on a phone, never removed: it is what gets read aloud.
  it('leaves the wide copy readable', () => {
    const html = draw('wide')
    expect(html).not.toContain(HIDDEN)
    expect(html).toContain(PIECE)
  })
})
