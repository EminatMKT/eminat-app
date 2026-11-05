import { describe, expect, it } from 'vitest'
import type { GestureColumnGeometry } from '../types'
import columnMinuteAt from '.'

describe('columnMinuteAt', () => {
  it('converts a clientY into a minute, relative to the column top', () => {
    const column: GestureColumnGeometry = { columnTop: 20, pxPerMin: 2 }

    expect(columnMinuteAt(column, 220)).toBe(100)
  })

  it('clamps to the start of the day above the column', () => {
    const column: GestureColumnGeometry = { columnTop: 50, pxPerMin: 2 }

    expect(columnMinuteAt(column, 0)).toBe(0)
  })
})
