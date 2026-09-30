import { describe, expect, it } from 'vitest'
import labels from './index'

describe('PieChartCard label actions', () => {
  it('falls back to identity labels and string values', () => {
    expect(labels.labelResolver(undefined)('paid')).toBe('paid')
    expect(labels.valueFormatter(undefined)(2)).toBe('2')
  })
})
