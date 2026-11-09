import { describe, expect, it } from 'vitest'
import { positionMenu } from './position'

const viewport = { top: 0, left: 0, width: 1280, height: 720 }
describe('row menu viewport collision handling', () => {
  it('opens below a first-row trigger with enough room', () => {
    expect(positionMenu({ top: 200, bottom: 224, right: 1200 }, { width: 170, height: 180 }, viewport)).toMatchObject({ top: 228, left: 1030, placement: 'bottom' })
  })
  it('opens above a bottom-row trigger instead of clipping its actions', () => {
    const pos = positionMenu({ top: 680, bottom: 704, right: 1200 }, { width: 170, height: 180 }, viewport)
    expect(pos).toMatchObject({ top: 496, placement: 'top' })
    expect(pos.top + 180).toBeLessThan(680)
  })
  it('constrains an oversized menu to the larger available side', () => {
    const pos = positionMenu({ top: 300, bottom: 324, right: 100 }, { width: 900, height: 1000 }, { ...viewport, width: 320, height: 480 })
    expect(pos.placement).toBe('top')
    expect(pos.left).toBe(8)
    expect(pos.maxWidth).toBe(304)
    expect(pos.top).toBe(8)
    expect(pos.maxHeight).toBe(288)
  })
  it('respects a panned or reduced visual viewport', () => {
    const pos = positionMenu({ top: 490, bottom: 514, right: 480 }, { width: 170, height: 120 }, { top: 200, left: 100, width: 320, height: 350 })
    expect(pos).toMatchObject({ top: 366, left: 242, placement: 'top' })
  })
})
