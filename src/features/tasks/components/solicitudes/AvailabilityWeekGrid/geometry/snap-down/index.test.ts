import { describe, expect, it } from 'vitest'
import snapMinutesDown from '.'

describe('snapMinutesDown', () => {
  it('floors to the half hour at or before the given minute', () => {
    expect(snapMinutesDown(29)).toBe(0)
    expect(snapMinutesDown(30)).toBe(30)
    expect(snapMinutesDown(59)).toBe(30)
  })
})
