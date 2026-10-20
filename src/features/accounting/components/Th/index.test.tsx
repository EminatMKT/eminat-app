import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Th from './index'

const YEAR = 2026
const HEADER_ELEMENT = /<th\b/
const RIGHT = 'right'

const draw = () => renderToStaticMarkup(<Th align={RIGHT}>{YEAR}</Th>)

describe('Th', () => {
  it('renders a header cell with alignment class', () => {
    const html = draw()
    expect(html).toMatch(HEADER_ELEMENT)
    expect(html).toContain(String(YEAR))
    expect(html).toContain(RIGHT)
  })
})
