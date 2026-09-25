import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import CatalogoSelect from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const CATALOG = { valores: ['payroll', 'contractors_vendors'], label: (v?: string) => (v ?? '').toUpperCase() }
const PLACEHOLDER = 'Select'
const ignore = () => undefined
const draw = (placeholder?: string) => renderToStaticMarkup(
  <CatalogoSelect catalogo={CATALOG} valor="" etiqueta="Category" placeholder={placeholder} onChange={ignore} />,
)

describe('CatalogoSelect', () => {
  // The stored value is the catalog one; only what is read on screen is translated.
  it('stores the catalog value and shows the translated name', () => {
    const html = draw()
    CATALOG.valores.forEach((v) => expect(html).toContain(`value="${v}"`))
    CATALOG.valores.forEach((v) => expect(html).toContain(CATALOG.label(v)))
  })

  it('offers no blank choice unless asked to', () => {
    expect(draw()).not.toContain('value=""')
  })

  it('offers the blank choice first, so nothing is picked on somebody else behalf', () => {
    const html = draw(PLACEHOLDER)
    expect(html).toContain('value=""')
    expect(html.indexOf(PLACEHOLDER)).toBeLessThan(html.indexOf(CATALOG.valores[0]))
  })

  it('reports the chosen value, not the event it arrived in', () => {
    let chosen = ''
    const remember = (v: string) => { chosen = v }
    const box = CatalogoSelect({ catalogo: CATALOG, valor: '', etiqueta: 'Category', onChange: remember }) as ReactElement<{ onChange: (e: unknown) => void }>
    box.props.onChange({ target: { value: CATALOG.valores[1] } })
    expect(chosen).toBe(CATALOG.valores[1])
  })
})
