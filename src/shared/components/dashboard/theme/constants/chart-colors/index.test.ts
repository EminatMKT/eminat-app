import {
  describe,
  it,
  expect,
} from 'vitest'
import CHART_COLORS from '.'

describe('CHART_COLORS', () => {
  it('is a palette of distinct hex colors', () => {
    expect(CHART_COLORS.length).toBeGreaterThan(0)
    expect(new Set(CHART_COLORS).size).toBe(CHART_COLORS.length)
    for (const color of CHART_COLORS) expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})
