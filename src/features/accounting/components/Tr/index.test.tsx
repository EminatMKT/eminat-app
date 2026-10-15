import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Tr from './index'

const draw = () => renderToStaticMarkup(<table><tbody><Tr><td>Cell</td></Tr></tbody></table>)

describe('Tr', () => {
  it('renders a table row with children', () => {
    const html = draw()
    expect(html).toContain('<tr')
    expect(html).toContain('Cell')
  })
})
