import config from '../constants'
import type { I18nKey, Locale, Vars } from '../types'

/** Translate a known key, preserving placeholders not supplied by the caller. */
export default function translate(locale: Locale, key: I18nKey, vars?: Vars): string {
  const { dictionaries, defaultLocale, placeholder } = config
  let text = dictionaries[locale][key]
  if (text == null) text = dictionaries[defaultLocale][key]
  if (text == null) text = key
  if (!vars) return text
  function replace(match: string, name: string): string {
    const value = vars?.[name]
    if (value == null) return match
    return String(value)
  }
  return text.replace(placeholder, replace)
}

// Dictionary lookup and interpolation are pure so they work identically during SSR and client renders.
