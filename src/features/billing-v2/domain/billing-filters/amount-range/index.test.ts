import { describe, expect, it } from 'vitest'
import inAmountRange from './index'

describe('inAmountRange', () => {
  it('includes closed and open decimal ranges', () => {
    expect(inAmountRange('100..200', '125.50')).toBe(true)
    expect(inAmountRange('500..', '900.00')).toBe(true)
    expect(inAmountRange('..130', '125.50')).toBe(true)
  })

  it('excludes unknown amounts from any range', () => {
    expect(inAmountRange('100..200', null)).toBe(false)
  })

  it('fails closed on invalid or malformed ranges', () => {
    expect(inAmountRange('abc..200', '125.50')).toBe(false)
    expect(inAmountRange('100..xyz', '125.50')).toBe(false)
    expect(inAmountRange('abc', '125.50')).toBe(false)
    expect(inAmountRange('100', '125.50')).toBe(false)
    expect(inAmountRange('100..200..300', '125.50')).toBe(false)
  })
})
