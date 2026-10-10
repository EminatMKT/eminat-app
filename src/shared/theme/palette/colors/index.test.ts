import { describe, it, expect } from 'vitest'
import rawColors from './index'

describe('theme/palette/colors', () => {
  it('registers exactly light and dark', () => {
    expect(Object.keys(rawColors.colors).sort()).toEqual(['dark', 'light'])
    expect(Object.keys(rawColors.inputOverrides).sort()).toEqual(['dark', 'light'])
  })

  it('dark is not a light copy: every raw color field differs', () => {
    expect(rawColors.colors.dark.bg).not.toBe(rawColors.colors.light.bg)
    expect(rawColors.colors.dark.s1).not.toBe(rawColors.colors.light.s1)
    expect(rawColors.colors.dark.border).not.toBe(rawColors.colors.light.border)
    expect(rawColors.colors.dark.t1).not.toBe(rawColors.colors.light.t1)
  })

  it('every palette has the same raw color keys', () => {
    expect(Object.keys(rawColors.colors.dark).sort()).toEqual(Object.keys(rawColors.colors.light).sort())
  })
})
