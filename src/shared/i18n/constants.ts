import es from './locales/es.json'
import en from './locales/en.json'
import type { I18nKey, Locale } from './types'

const dictionaries: Record<Locale, Record<I18nKey, string>> = { es, en }
const defaultLocale: Locale = 'es'
const supported: readonly Locale[] = ['es', 'en']
const intl: Record<Locale, string> = { es: 'es-EC', en: 'en-US' }
const localeConfig = {
  dictionaries,
  defaultLocale,
  supported,
  intl,
  storageKey: 'locale',
  placeholder: /\{(\w+)\}/g,
}

export default localeConfig
