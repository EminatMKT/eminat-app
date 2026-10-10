import { describe, it, expect } from 'vitest'
import getTheme from './index'
import { THEMES, THEME_ORDER } from '../constants'

describe('theme/tokens/lookup', () => {
  it('resolves each registered name to its own palette', () => {
    expect(getTheme('light')).toBe(THEMES.light)
    expect(getTheme('dark')).toBe(THEMES.dark)
  })

  it('every palette carries the shared accent and a full token set', () => {
    for (const name of THEME_ORDER) {
      const theme = getTheme(name)
      expect(theme.accent).toBe(THEMES.light.accent)
      expect(Object.keys(theme).sort()).toEqual(
        ['accent', 'bg', 'border', 'inputStyle', 's1', 's2', 's3', 't1', 't2', 't3'],
      )
    }
  })
})
