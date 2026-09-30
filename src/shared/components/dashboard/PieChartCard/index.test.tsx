import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PieChartCard from './index'
import EMPTY_CHART_TEXT from './constants/empty-chart-text'

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const DATA = [
  { name: 'payroll', value: 3 },
  { name: 'contractors', value: 1 },
]
const COLORS = { payroll: '#111', contractors: '#222' }
const TITLE = 'Totals'

describe('PieChartCard', () => {
  it('renders a filled pie by default, with no center total', () => {
    const html = renderToStaticMarkup(<PieChartCard title={TITLE} persistKey="p" data={DATA} colors={COLORS} />)
    expect(html).not.toContain('50%')
  })

  it('shows the center total only when donut is on and a centerLabel is given', () => {
    const html = renderToStaticMarkup(<PieChartCard title={TITLE} persistKey="p" data={DATA} colors={COLORS} donut centerLabel="$4.00" />)
    expect(html).toContain('$4.00')
  })

  it('formats the legend through formatValue when given', () => {
    const money = (v: number) => `$${v}.00`
    const html = renderToStaticMarkup(<PieChartCard title={TITLE} persistKey="p" data={DATA} colors={COLORS} formatValue={money} />)
    expect(html).toContain('$3.00')
    expect(html).toContain('$1.00')
  })

  it('shows an empty state when there is no chart data', () => {
    const html = renderToStaticMarkup(<PieChartCard title={TITLE} persistKey="p" data={[]} colors={COLORS} />)
    expect(html).toContain(EMPTY_CHART_TEXT)
  })
})
