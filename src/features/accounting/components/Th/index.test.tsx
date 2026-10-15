import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Th from './index'

const draw = () => renderToStaticMarkup(<table><thead><tr><Th align="right">Amount</Th></tr></thead></table>)

describe('Th', () => {
  it('renders a header cell with alignment class', () => {
    const html = draw()
    expect(html).toContain('<th')
    expect(html).toContain('Amount')
    expect(html).toContain('right')
  })
})
