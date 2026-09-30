import { describe, expect, it, vi } from 'vitest'
import actions from './index'

describe('PieChartCard actions', () => {
  it('dims unselected slices and keeps the selected one opaque', () => {
    expect(actions.sliceOpacity({ name: 'paid', value: 1 }, 'paid')).toBe(1)
    expect(actions.sliceOpacity({ name: 'pending', value: 1 }, 'paid')).toBe(0.28)
  })

  it('builds optional handlers only when a selector exists', () => {
    const select = vi.fn()
    actions.selectSlice(select, 'paid')?.()
    expect(select).toHaveBeenCalledWith('paid')
    expect(actions.selectSlice(undefined, 'paid')).toBeUndefined()
  })
})
