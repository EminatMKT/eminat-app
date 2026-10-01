import type { ReactNode } from 'react'
import type es from './locales/es.json'

export type Locale = 'es' | 'en'
export type I18nKey = keyof typeof es
export type Vars = Record<string, string | number>
export type LocaleState = {
  locale: Locale
  intlLocale: string
  setLocale: (locale: Locale) => void
  t: (key: I18nKey, vars?: Vars) => string
}
export type ProviderProps = { children: ReactNode }
