import { describe, it, expect } from 'vitest'
import { THEMES, THEME_ORDER } from './index'

describe('theme/tokens/constants/build', () => {
  it('registers exactly light and dark, in toggle order', () => {
    expect(THEME_ORDER).toEqual(['light', 'dark'])
    expect(Object.keys(THEMES).sort()).toEqual(['dark', 'light'])
  })

  it('every registered theme shares the same accent and the same token keys', () => {
    const [light, dark] = THEME_ORDER.map(name => THEMES[name])
    expect(dark.accent).toBe(light.accent)
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
  })

  it('dark is not a light copy: the surface and text colors differ', () => {
    expect(THEMES.dark.bg).not.toBe(THEMES.light.bg)
    expect(THEMES.dark.s1).not.toBe(THEMES.light.s1)
    expect(THEMES.dark.border).not.toBe(THEMES.light.border)
    expect(THEMES.dark.t1).not.toBe(THEMES.light.t1)
  })
})
