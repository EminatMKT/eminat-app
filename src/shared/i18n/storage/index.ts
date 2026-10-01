import config from '../constants'
import type { Locale } from '../types'

function read(): Locale {
  try {
    const saved = localStorage.getItem(config.storageKey)
    for (const locale of config.supported) {
      if (saved === locale) return locale
    }
    return config.defaultLocale
  } catch {
    return config.defaultLocale
  }
}

function write(locale: Locale): boolean {
  try {
    localStorage.setItem(config.storageKey, locale)
    return true
  } catch {
    return false
  }
}

const storage = { read, write }
export default storage

// Raw locale values remain compatible with existing browsers; denied storage falls back to session state.
