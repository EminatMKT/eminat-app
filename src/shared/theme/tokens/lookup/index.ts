import type { Theme, ThemeName } from '@/shared/theme/types'
import { THEMES } from '../constants'

export default function getTheme(name: ThemeName): Theme {
  return THEMES[name] ?? THEMES.light
}

// Resolves a theme name to its registered Theme, falling back to light if the name is unknown.
