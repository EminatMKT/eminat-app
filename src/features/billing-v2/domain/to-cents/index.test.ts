import { describe, it, expect } from 'vitest'
import toCents from './index'

describe('toCents', () => {
  it('reads whole and decimal digits as an integer number of cents', () => {
    expect(toCents('10.50')).toBe(1050)
  })

  it('pads a single decimal digit, and zero-fills a missing one', () => {
    expect(toCents('10.5')).toBe(1050)
    expect(toCents('10')).toBe(1000)
  })
})
