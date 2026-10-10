import type { Theme, ThemeName } from '@/shared/theme/types'
import palette from '@/shared/theme/palette'

export const THEME_ORDER = palette.order

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    ...palette.colors.light,
    accent: palette.accent,
    inputStyle: { ...palette.baseInput, ...palette.inputOverrides.light },
  },
  dark: {
    ...palette.colors.dark,
    accent: palette.accent,
    inputStyle: { ...palette.baseInput, ...palette.inputOverrides.dark },
  },
}

// Combines the raw palette (@/shared/theme/palette) into the full Theme objects per name.
