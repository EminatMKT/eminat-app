import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '@/shared/i18n'
import Field from '@/shared/components/ui/Field'
import CatalogoSelect from '../index'

// Fixtures, not shipped copy: callers hand Field and the select text their own locale produced.
const LABEL = 'fixture bucket'
const ERROR = 'fixture bucket is missing'
const TAG = 'select'
const CATALOG = { valores: ['payroll', 'contractors_vendors'], label: (v?: string) => v ?? '' }
const ignore = () => undefined
const attribute = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1]
/** The select's own opening tag, where its id and its aria state live. */
const openingTag = (html: string) => html.match(new RegExp(`<${TAG}[^>]*>`))?.[0] ?? ''
const draw = (error?: string) => renderToStaticMarkup(
  <LocaleProvider>
    <Field label={LABEL} error={error}>
      <CatalogoSelect catalogo={CATALOG} valor="" etiqueta={LABEL} placeholder={LABEL} onChange={ignore} />
    </Field>
  </LocaleProvider>,
)

describe('CatalogoSelect inside a Field', () => {
  // Clicking the visible label has to move the focus to the select: they share one id.
  it('is the control its Field label points at', () => {
    const html = draw()
    const target = attribute(html, 'for')
    expect(target).toBeTruthy()
    expect(openingTag(html)).toContain(`id="${target}"`)
  })

  // A select with an error says so, and its message is read with it, like any other box.
  it('is marked invalid and described by its error when the Field has one', () => {
    const html = draw(ERROR)
    const errorId = attribute(openingTag(html), 'aria-describedby')
    expect(openingTag(html)).toContain('aria-invalid="true"')
    expect(html).toMatch(new RegExp(`id="${errorId}"[^>]*>${ERROR}<`))
  })
})
