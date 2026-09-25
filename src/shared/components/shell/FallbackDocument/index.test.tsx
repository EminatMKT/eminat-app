import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FallbackDocument from './index'

const CONTENT = 'page'
const HTML_TAG = '<html'
const BODY_TAG = '<body'
const LANG = 'lang="es"'
const draw = () => renderToStaticMarkup(<FallbackDocument>{CONTENT}</FallbackDocument>)

describe('FallbackDocument', () => {
  // `global-error` replaces the root layout, so it has to bring its own html and body.
  it('draws the html and body around the page', () => {
    const html = draw()
    expect(html.startsWith(HTML_TAG)).toBe(true)
    expect(html).toContain(BODY_TAG)
    expect(html).toContain(CONTENT)
  })

  it('keeps the language of the root layout', () => {
    expect(draw()).toContain(LANG)
  })
})
