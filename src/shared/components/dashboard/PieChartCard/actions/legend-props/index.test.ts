import { describe, expect, it } from 'vitest'
import legendProps from './index'

describe('PieChartCard legend props', () => {
  it('formats names before handing them to the legend row', () => {
    const row = { name: 'paid', value: 1 }
    expect(legendProps(row, name => name.toUpperCase(), 1, { paid: '#111' }, String).name).toBe('PAID')
  })
})
