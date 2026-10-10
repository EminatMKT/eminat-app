'use client'
import { usePersistedState, oneOf } from '@/shared/hooks/usePersistedState'
import type { ThemeName } from '@/shared/theme/types'

const STORAGE_KEY = 'eminat-theme'
const LIGHT: ThemeName = 'light'
const DARK: ThemeName = 'dark'
const isThemeName = oneOf(LIGHT, DARK)

export default function useTheme() {
  const [theme, setTheme] = usePersistedState<ThemeName>(STORAGE_KEY, LIGHT, isThemeName)
  return { theme, setTheme }
}

// Active theme, persisted through usePersistedState (same SSR-safe-default +
// post-mount-hydration pattern as every other UI preference in this app).
