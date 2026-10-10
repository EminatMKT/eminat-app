export type { Theme, ThemeName } from '../types'
export { default as getTheme } from './lookup'

// Public surface of the theme module: the Theme/ThemeName shapes and getTheme, which resolves
// a name to its Theme. THEMES/THEME_ORDER (./constants) are internal: nothing outside consumes
// them today, so they stay out of this barrel until something does.
