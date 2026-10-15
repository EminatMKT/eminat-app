import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Td from './index'

const draw = () => renderToStaticMarkup(<table><tbody><tr><Td align="right" mono bold color="#445566">Amount</Td></tr></tbody></table>)

describe('Td', () => {
  it('renders a data cell with formatting classes and a color variable', () => {
    const html = draw()
    expect(html).toContain('<td')
    expect(html).toContain('Amount')
    expect(html).toContain('--td-color:#445566')
  })
})
