'use client'

import { createContext, useContext, useMemo } from 'react'
import { messages, type Locale, type MessageKey } from '@/features/meet/lib/i18n'
import { useT } from '@/shared/i18n'
import { useApp } from '@/shared/context/AppContext'

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
  const { locale, setLocale } = useT()
  const { theme, setTheme } = useApp()

  const value = useMemo<Preferences>(() => ({
    locale,
    theme,
    setLocale,
    setTheme,
    t: (key) => messages[locale][key],
    formatDate: (date, options) => new Intl.DateTimeFormat(locale === 'es' ? 'es-EC' : 'en-US', options ?? { dateStyle: 'medium' }).format(new Date(date)),
  }), [locale, theme, setLocale, setTheme])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider')
  return context
}

export type { Locale, MessageKey }
