import { describe, expect, it } from 'vitest'
import snapMinutesUp from '.'

describe('snapMinutesUp', () => {
  it('ceils to the half hour at or after the given minute', () => {
    expect(snapMinutesUp(1)).toBe(30)
    expect(snapMinutesUp(30)).toBe(30)
    expect(snapMinutesUp(31)).toBe(60)
  })
})
