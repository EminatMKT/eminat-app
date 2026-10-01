import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import translate from '@/shared/i18n/translate'
import type { I18nKey } from '@/shared/i18n'
import Button from './index'

const english = (key: I18nKey) => translate('en', key)
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: english }) }))
const DUPLICATE: I18nKey = 'common.duplicate'
const LOADING: I18nKey = 'common.loading'
const RETRY: I18nKey = 'common.retry'
const CANCEL: I18nKey = 'common.cancel'
const MISSING: I18nKey = 'common.saveBlocked.missing'

describe('Button', () => {
  it('names the icon-only duplicate action and shares its icon', () => {
    const html = renderToStaticMarkup(<Button kind="duplicate" iconOnly onClick={vi.fn()} />)
    expect(html).toContain(`aria-label="${english(DUPLICATE)}"`)
    expect(html).toContain('⧉')
    expect(html).toContain('type="button"')
  })
  it('disables busy actions and announces their status', () => {
    const html = renderToStaticMarkup(<Button kind="confirm" ocupado onClick={vi.fn()} />)
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain(english(LOADING))
  })
  it('enables retry after the caller clears a failed operation', () => {
    const html = renderToStaticMarkup(<Button kind="retry" ocupado={false} onClick={vi.fn()} />)
    expect(html).not.toContain('disabled=')
    expect(html).toContain(english(RETRY))
  })
  it('explains why a disabled action is unavailable', () => {
    const html = renderToStaticMarkup(<Button kind="confirm" deshabilitado disabledReason={english(MISSING)} onClick={vi.fn()} />)
    expect(html).toContain(`title="${english(MISSING)}"`)
  })
  it('keeps text when iconOnly is requested for an iconless action', () => {
    const html = renderToStaticMarkup(<Button kind="cancel" iconOnly onClick={vi.fn()} />)
    expect(html).toContain(english(CANCEL))
    expect(html).not.toContain('aria-label=')
  })
})
