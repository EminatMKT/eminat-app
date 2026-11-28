import { describe, expect, it } from 'vitest'
import { localeConfig } from '@/shared/i18n'
import row from '@/features/tasks/hooks/useWorkerReport/test-fixtures/row'
import defaultExport, { ENGLISH_LOCALE, SPANISH_LOCALE } from '.'

const UNDEFINED_SENTINEL = undefined

describe('useWorkerReport test-fixtures constants', () => {
  it('wires SPANISH_LOCALE to localeConfig.intl.es', () => {
    expect(SPANISH_LOCALE).toBe(localeConfig.intl.es)
  })

  it('wires ENGLISH_LOCALE to localeConfig.intl.en', () => {
    expect(ENGLISH_LOCALE).toBe(localeConfig.intl.en)
  })

  it('never resolves either locale to undefined', () => {
    expect(SPANISH_LOCALE).not.toBe(UNDEFINED_SENTINEL)
    expect(ENGLISH_LOCALE).not.toBe(UNDEFINED_SENTINEL)
  })

  it('resolves both locales to non-empty strings', () => {
    expect(SPANISH_LOCALE.length).toBeGreaterThan(0)
    expect(ENGLISH_LOCALE.length).toBeGreaterThan(0)
  })

  it('keeps SPANISH_LOCALE and ENGLISH_LOCALE distinct', () => {
    expect(SPANISH_LOCALE).not.toBe(ENGLISH_LOCALE)
  })

  it('re-exports row as its default export', () => {
    expect(defaultExport).toBe(row)
  })
})
