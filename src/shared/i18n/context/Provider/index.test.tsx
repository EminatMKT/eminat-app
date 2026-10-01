import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EffectCallback } from 'react'
import LocaleProvider from './index'
import useT from '../useT'

const effects = vi.hoisted(() => ({ callbacks: Array<EffectCallback>() }))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useEffect: (callback: EffectCallback) => effects.callbacks.push(callback) }
})
afterEach(() => { effects.callbacks = []; vi.unstubAllGlobals() })

function ReadLocale() {
  const { locale, intlLocale, t } = useT()
  return `${locale}|${intlLocale}|${t('common.duplicate')}`
}

describe('LocaleProvider', () => {
  it('renders the default locale without accessing storage during SSR', () => {
    const getItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem })
    expect(renderToStaticMarkup(<LocaleProvider><ReadLocale /></LocaleProvider>)).toBe('es|es-EC|Duplicar')
    expect(getItem).not.toHaveBeenCalled()
  })
  it('synchronizes the document language on mount even when storage is denied', () => {
    const document = { documentElement: { lang: 'en' } }
    vi.stubGlobal('document', document)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') } })
    renderToStaticMarkup(<LocaleProvider><ReadLocale /></LocaleProvider>)
    for (const effect of effects.callbacks) effect()
    expect(document.documentElement.lang).toBe('es')
  })
})
