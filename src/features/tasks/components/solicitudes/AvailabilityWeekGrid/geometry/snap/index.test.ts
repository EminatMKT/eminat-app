import { describe, expect, it } from 'vitest'
import snapMinutes from '.'

describe('snapMinutes', () => {
  it('rounds to the nearest half hour', () => {
    expect(snapMinutes(14)).toBe(0)
    expect(snapMinutes(16)).toBe(30)
  })

  it('leaves an exact half-hour boundary untouched', () => {
    expect(snapMinutes(90)).toBe(90)
  })
})
