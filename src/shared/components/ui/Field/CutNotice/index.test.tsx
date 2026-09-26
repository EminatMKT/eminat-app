import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '@/shared/i18n'
import es from '@/shared/i18n/locales/es.json'
import CutNotice from './index'

// Fixtures, not shipped copy.
const FIELD = 'Concept'
const ID = 'title-cut'
const MAX = 120
const CUT = 80

const draw = (cut: number) =>
  renderToStaticMarkup(<LocaleProvider><CutNotice id={ID} cut={cut} field={FIELD} max={MAX} /></LocaleProvider>)

/** The Spanish copy with its blanks filled, as the default locale draws it. */
function spanish(template: string, n: number) {
  const counted = template.replace('{n}', String(n))
  const named = counted.replace('{field}', FIELD)
  return named.replace('{max}', String(MAX))
}

describe('CutNotice', () => {
  it('says how much was cut and which field set the limit', () => {
    expect(draw(CUT)).toContain(spanish(es['common.field.cutMany'], CUT))
  })

  it('speaks of one character in the singular', () => {
    expect(draw(1)).toContain(spanish(es['common.field.cutOne'], 1))
  })

  // The region is there before anything is cut, so the first notice is announced when it arrives.
  it('keeps an empty, polite live region while nothing was cut', () => {
    const html = draw(0)
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain(`id="${ID}"`)
    expect(html).not.toContain(FIELD)
  })
})
