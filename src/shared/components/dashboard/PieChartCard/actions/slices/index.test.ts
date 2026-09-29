import { describe, expect, it, vi } from 'vitest'
import slices from './index'

describe('PieChartCard slice actions', () => {
  it('dims other slices while keeping the selected one opaque', () => {
    expect(slices.sliceOpacity({ name: 'paid', value: 1 }, 'paid')).toBe(1)
    expect(slices.sliceOpacity({ name: 'pending', value: 1 }, 'paid')).toBe(0.28)
  })

  it('builds optional click handlers', () => {
    const select = vi.fn()
    slices.selectSlice(select, 'paid')?.()
    expect(select).toHaveBeenCalledWith('paid')
    expect(slices.selectSlice(undefined, 'paid')).toBeUndefined()
  })
})
