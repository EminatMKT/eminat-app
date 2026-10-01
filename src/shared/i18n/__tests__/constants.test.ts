import { describe, expect, it } from 'vitest'
import config from '../constants'

describe('locale catalog', () => {
  it('registers every supported language in all locale catalogs', () => {
    expect(Object.keys(config.dictionaries).sort()).toEqual([...config.supported].sort())
    expect(Object.keys(config.intl).sort()).toEqual([...config.supported].sort())
  })
  it('keeps the Spanish SSR default and region-specific formatting', () => {
    expect(config.defaultLocale).toBe('es')
    expect(config.intl).toEqual({ es: 'es-EC', en: 'en-US' })
  })
  it.each(config.supported)('requires nonblank text for every key in %s', locale => {
    const dictionary = config.dictionaries[locale]
    const requiredKeys = Object.keys(config.dictionaries[config.defaultLocale]).sort()
    expect(Object.keys(dictionary).sort(), `${locale}: translation keys must match`).toEqual(requiredKeys)
    for (const [key, text] of Object.entries(dictionary)) {
      expect(text.trim(), `${locale}: ${key} must have a translation`).not.toBe('')
    }
  })
})
