import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '@/shared/i18n'
import CharCount from './index'

const ID = 'title-count'
const MAX = 120
const FAR = 60
const NEAR = 118

const draw = (length: number) =>
  renderToStaticMarkup(<LocaleProvider><CharCount id={ID} length={length} max={MAX} /></LocaleProvider>)

describe('CharCount', () => {
  it('draws nothing far from the limit', () => {
    expect(draw(FAR)).toBe('')
  })

  it('draws the count in the quiet tone near the limit', () => {
    const html = draw(NEAR)
    expect(html).toContain(`${NEAR}/${MAX}`)
    expect(html).toContain('data-tone="near"')
  })

  it('switches to the warning tone at the limit', () => {
    expect(draw(MAX)).toContain('data-tone="full"')
  })

  // Read when the box is focused, never on each keystroke: it is not a live region.
  it('is not announced as it changes', () => {
    const html = draw(NEAR)
    expect(html).toContain(`id="${ID}"`)
    expect(html).not.toContain('aria-live')
  })
})
