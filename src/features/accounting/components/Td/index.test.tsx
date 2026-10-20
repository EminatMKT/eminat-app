import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Td from './index'

const AMOUNT = '1,250.00'
const COLOR = 'var(--c-t2)'
const CELL_ELEMENT = /<td\b/
const COLOR_STYLE = `--td-color:${COLOR}`

const draw = () => renderToStaticMarkup(<Td align="right" mono bold color={COLOR}>{AMOUNT}</Td>)

describe('Td', () => {
  it('renders a data cell with formatting classes and a color variable', () => {
    const html = draw()
    expect(html).toMatch(CELL_ELEMENT)
    expect(html).toContain(AMOUNT)
    expect(html).toContain(COLOR_STYLE)
  })
})
