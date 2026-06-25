'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import es from './locales/es.json'
import en from './locales/en.json'

// i18n liviano (patrón recomendado de Next App Router: diccionarios JSON propios, sin librería).
// Locale por usuario en localStorage — no en la URL (es una app interna, no necesita routing por idioma).
export type Locale = 'es' | 'en'
const DICTS: Record<Locale, Record<string, string>> = { es, en }
const DEFAULT: Locale = 'es'

function interpolate(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`)) : s
}

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}
const LocaleCtx = createContext<Ctx | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT)
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null) as Locale | null
    if (saved === 'es' || saved === 'en') setLocaleState(saved)
  }, [])
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem('locale', l) } catch {}
  }, [])
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(DICTS[locale][key] ?? DICTS[DEFAULT][key] ?? key, vars),
    [locale],
  )
  return <LocaleCtx.Provider value={{ locale, setLocale, t }}>{children}</LocaleCtx.Provider>
}

export function useT() {
  const ctx = useContext(LocaleCtx)
  if (!ctx) throw new Error('useT debe usarse dentro de <LocaleProvider>')
  return ctx
}
