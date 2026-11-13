import { describe, expect, it } from 'vitest'
import clickCreateRange from '.'

describe('clickCreateRange', () => {
  it('defaults to a full hour, snapped down from the click point', () => {
    const bounds = { start: 0, end: 1440 }

    expect(clickCreateRange(bounds, 615)).toEqual({ start: 600, end: 660 })
  })

  it('shortens to the available room when under an hour is free', () => {
    const bounds = { start: 540, end: 600 }

    expect(clickCreateRange(bounds, 570)).toEqual({ start: 540, end: 600 })
  })

  it('moves back to fit a full hour before the end of a short gap', () => {
    const bounds = { start: 0, end: 660 }

    expect(clickCreateRange(bounds, 630)).toEqual({ start: 600, end: 660 })
  })
})
