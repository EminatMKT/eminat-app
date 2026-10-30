import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Counter from './index'

describe('Counter', () => {
  it('draws the text under the given id', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="20 characters remaining" />)

    expect(html).toContain('id="note-counter"')
    expect(html).toContain('20 characters remaining')
  })

  it('flags the near-limit state as a data attribute', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

    expect(html).toContain('data-near-limit="true"')
  })
})
