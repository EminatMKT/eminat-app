'use client'
import { useCallback, useEffect, useState } from 'react'
import config from '@/shared/i18n/constants'
import LocaleContext from '../value'
import storage from '@/shared/i18n/storage'
import translate from '@/shared/i18n/translate'
import type { I18nKey, Locale, LocaleState, ProviderProps, Vars } from '@/shared/i18n/types'

/** Hydrate the saved language after SSR and synchronize document accessibility metadata. */
export default function LocaleProvider({ children }: ProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(config.defaultLocale)
  useEffect(() => { setLocaleState(storage.read()) }, [])
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    // Persistence is optional: a denied write must not prevent changing this session's language.
    storage.write(next)
  }, [])
  const t = useCallback((key: I18nKey, vars?: Vars) => translate(locale, key, vars), [locale])
  const value: LocaleState = {
    locale,
    intlLocale: config.intl[locale],
    setLocale,
    t,
  }
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

// The first render matches the server; only effects read browser preferences or update the document.
