import { describe, expect, it } from 'vitest'
import pieProps from './index'

describe('PieChartCard pie props', () => {
  it('keeps chart data and radius together', () => {
    const row = { name: 'paid', value: 2 }
    const props = pieProps([row], true, 2, 'pct')
    expect(props.data).toEqual([row])
    expect(props.innerRadius).toBe('55%')
  })
})
