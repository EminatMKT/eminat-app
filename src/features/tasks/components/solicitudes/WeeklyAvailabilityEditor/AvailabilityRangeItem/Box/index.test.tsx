import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Box from './index'

describe('Box', () => {
  it('renders a div by default, carrying its className', () => {
    const html = renderToStaticMarkup(<Box className="times">{1}</Box>)

    expect(html).toBe('<div class="times">1</div>')
  })

  it('renders the requested tag', () => {
    const html = renderToStaticMarkup(<Box as="li" className="item">{1}</Box>)

    expect(html).toBe('<li class="item">1</li>')
  })
})
