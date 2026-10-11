'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { messages, STORAGE_LOCALE, STORAGE_THEME, type Locale, type MessageKey } from '@/features/meet/lib/i18n'

export type Theme = 'light' | 'dark'

type Preferences = {
  locale: Locale
  theme: Theme
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
  t: (key: MessageKey) => string
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string
}

const PreferencesContext = createContext<Preferences | null>(null)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es')
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const storedLocale = localStorage.getItem(STORAGE_LOCALE)
    const storedTheme = localStorage.getItem(STORAGE_THEME)
    const initialLocale: Locale = storedLocale === 'en' ? 'en' : 'es'
    const initialTheme: Theme = storedTheme === 'dark' ? 'dark' : 'light'
    setLocaleState(initialLocale)
    setThemeState(initialTheme)
  }, [])

  const setLocale = (value: Locale) => {
    localStorage.setItem(STORAGE_LOCALE, value)
    setLocaleState(value)
  }
  const setTheme = (value: Theme) => {
    localStorage.setItem(STORAGE_THEME, value)
    setThemeState(value)
  }

  const value = useMemo<Preferences>(() => ({
    locale,
    theme,
    setLocale,
    setTheme,
    t: (key) => messages[locale][key],
    formatDate: (date, options) => new Intl.DateTimeFormat(locale === 'es' ? 'es-EC' : 'en-US', options ?? { dateStyle: 'medium' }).format(new Date(date)),
  }), [locale, theme])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider')
  return context
}

export type { Locale, MessageKey }
