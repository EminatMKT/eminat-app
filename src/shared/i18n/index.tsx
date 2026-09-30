'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import es from './locales/es.json'
import enJson from './locales/en.json'
export type Locale = 'es' | 'en'
export type I18nKey = keyof typeof es
type Vars = Record<string, string | number>
type Ctx = {
  locale: Locale
  intlLocale: string
  setLocale: (l: Locale) => void
  t: (key: I18nKey, vars?: Vars) => string
}
const en = enJson satisfies Record<I18nKey, string>
const DICTS: Record<Locale, Record<I18nKey, string>> = { es, en }
const DEFAULT: Locale = 'es'
const INTL: Record<Locale, string> = { es: 'es-EC', en: 'en-US' }
const LocaleCtx = createContext<Ctx | null>(null)
function interpolate(s: string, vars?: Vars) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`))
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT)
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null) as Locale | null
    if (saved === 'es' || saved === 'en') setLocaleState(saved)
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem('locale', l) } catch {}
  }, [])
  const t = useCallback(
    (key: I18nKey, vars?: Vars) => interpolate(DICTS[locale][key] ?? DICTS[DEFAULT][key] ?? key, vars),
    [locale],
  )
  return <LocaleCtx.Provider value={{ locale, intlLocale: INTL[locale], setLocale, t }}>{children}</LocaleCtx.Provider>
}
export function useT() {
  const ctx = useContext(LocaleCtx)
  if (!ctx) throw new Error('useT debe usarse dentro de <LocaleProvider>')
  return ctx
}
