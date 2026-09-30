import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import percentText from './index'

describe('PieChartCard percent text', () => {
  it('draws a percentage at the computed slice point', () => {
    const text = percentText(10, 20, 50, 'pct')
    expect(renderToStaticMarkup(text)).toContain('50%')
  })
})
