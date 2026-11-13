import { describe, expect, it } from 'vitest'
import minutesToPixels from '.'

describe('minutesToPixels', () => {
  it('scales minutes since midnight by the given pixel density', () => {
    expect(minutesToPixels(90, 2)).toBe(180)
  })

  it('returns zero at midnight regardless of density', () => {
    expect(minutesToPixels(0, 3)).toBe(0)
  })
})
