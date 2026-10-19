import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Td from '../Td'
import Tr from './index'

const INVOICE_COUNT = 42
const ROW_ELEMENT = /<tr\b/

const draw = () => renderToStaticMarkup(<Tr><Td>{INVOICE_COUNT}</Td></Tr>)

describe('Tr', () => {
  it('renders a table row with children', () => {
    const html = draw()
    expect(html).toMatch(ROW_ELEMENT)
    expect(html).toContain(String(INVOICE_COUNT))
  })
})
