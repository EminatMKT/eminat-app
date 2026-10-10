import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Bar from './index'

const draw = () => renderToStaticMarkup(<Bar label="Sales" value={50} max={100} color="#123456" />)

describe('Bar', () => {
  it('renders the label formatted value and dynamic fill variables', () => {
    const html = draw()
    expect(html).toContain('Sales')
    expect(html).toContain('$50.00')
    expect(html).toContain('--bar-width:50%')
    expect(html).toContain('--bar-color:#123456')
  })
})
