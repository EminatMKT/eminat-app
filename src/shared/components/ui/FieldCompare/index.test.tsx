import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '@/shared/i18n'
import FieldCompare from './index'

// Fixtures, not shipped copy — the Spanish defaults for these two i18n keys.
const INCOMING_LABEL = 'Archivo'
const NO_VALUE_LABEL = 'Sin valor'
const VALUES = ['Ana', 'Ana López']
const ignore = () => undefined

const draw = (props: Parameters<typeof FieldCompare>[0]) =>
  renderToStaticMarkup(<LocaleProvider><FieldCompare {...props} /></LocaleProvider>)

describe('FieldCompare', () => {
  it('shows the field label and one cell per value', () => {
    const html = draw({ labelKey: 'import.merge.incoming', values: VALUES, diff: false })
    expect(html).toContain(INCOMING_LABEL)
    expect(html).toContain('Ana')
    expect(html).toContain('Ana López')
  })

  it('names the empty state instead of drawing a value-less row', () => {
    const html = draw({ labelKey: 'import.merge.incoming', values: [], diff: false })
    expect(html).toContain(NO_VALUE_LABEL)
    expect(html).not.toContain('<button')
  })

  it('composes a pill per value once a caller can choose one', () => {
    const html = draw({
      labelKey: 'import.merge.incoming',
      values: VALUES,
      diff: true,
      selectedValue: 'Ana',
      onChooseValue: ignore,
    })
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
  })
})
