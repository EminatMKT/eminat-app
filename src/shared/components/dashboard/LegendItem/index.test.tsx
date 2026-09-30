import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LegendItem from './index'

describe('LegendItem', () => {
  it('shows the raw value as-is when no formatter is given', () => {
    const html = renderToStaticMarkup(<LegendItem name="payroll" value={45} total={100} color="#000" />)
    expect(html).toContain('>45<')
  })

  it('formats the value through formatValue, but computes the percentage from the raw one', () => {
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
    const html = renderToStaticMarkup(<LegendItem name="payroll" value={4500} total={9000} color="#000" formatValue={money} />)
    expect(html).toContain('$45.00')
    expect(html).toContain('50%')
  })

  it('reads 0% when the group has nothing yet, instead of dividing by zero', () => {
    const html = renderToStaticMarkup(<LegendItem name="payroll" value={0} total={0} color="#000" />)
    expect(html).toContain('0%')
  })
})
