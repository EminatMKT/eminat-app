import { describe, expect, it } from 'vitest'
import pixelToMinute from '.'
import type { PixelToMinuteInput } from './types'

describe('pixelToMinute', () => {
  it('inverts minutesToPixels relative to the column top', () => {
    const input: PixelToMinuteInput = { clientY: 220, columnTop: 20, pxPerMin: 2 }

    expect(pixelToMinute(input)).toBe(100)
  })

  it('clamps a point above the column to the start of the day', () => {
    const input: PixelToMinuteInput = { clientY: 0, columnTop: 50, pxPerMin: 2 }

    expect(pixelToMinute(input)).toBe(0)
  })

  it('clamps a point below the column to the end of the day', () => {
    const input: PixelToMinuteInput = { clientY: 10000, columnTop: 0, pxPerMin: 2 }

    expect(pixelToMinute(input)).toBe(1440)
  })
})
