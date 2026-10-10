import { describe, it, expect } from 'vitest'
import palette from './index'

describe('theme/palette', () => {
  it('registers exactly light and dark, in toggle order', () => {
    expect(palette.order).toEqual(['light', 'dark'])
    expect(Object.keys(palette.colors).sort()).toEqual(['dark', 'light'])
    expect(Object.keys(palette.inputOverrides).sort()).toEqual(['dark', 'light'])
  })

  it('dark is not a light copy: every raw color field differs', () => {
    expect(palette.colors.dark.bg).not.toBe(palette.colors.light.bg)
    expect(palette.colors.dark.s1).not.toBe(palette.colors.light.s1)
    expect(palette.colors.dark.border).not.toBe(palette.colors.light.border)
    expect(palette.colors.dark.t1).not.toBe(palette.colors.light.t1)
  })

  it('every palette has the same raw color keys and a usable base input', () => {
    expect(Object.keys(palette.colors.dark).sort()).toEqual(Object.keys(palette.colors.light).sort())
    expect(palette.baseInput.outline).toBe('none')
  })
})
