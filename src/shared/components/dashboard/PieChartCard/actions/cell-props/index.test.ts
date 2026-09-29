import { describe, expect, it, vi } from 'vitest'
import cellProps from './index'

describe('PieChartCard cell props', () => {
  it('connects cell colors and click handler', () => {
    const select = vi.fn()
    const props = cellProps({ name: 'paid', value: 1 }, { paid: '#111' }, undefined, select, 'click')
    props.onClick?.()
    expect(props.fill).toBe('#111')
    expect(select).toHaveBeenCalledWith('paid')
  })
})
