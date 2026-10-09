'use client'
import { useCallback, useEffect, useState } from 'react'
import { THEMES, type ThemeName } from './tokens'

const STORAGE_KEY = 'eminat-theme'
const DEFAULT_THEME: ThemeName = 'light'

function isThemeName(v: string | null): v is ThemeName {
  return v != null && v in THEMES
}

// Tema activo (por nombre) con persistencia en localStorage.
//
// SSR-safe: arranca en DEFAULT_THEME (coincide con el render del servidor,
// evita hydration mismatch) y se hidrata desde localStorage post-montaje.
// La preferencia se persiste sólo al cambiarla (setTheme).
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isThemeName(stored)) setThemeState(stored)
  }, [])

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, name)
  }, [])

  return { theme, setTheme }
}
