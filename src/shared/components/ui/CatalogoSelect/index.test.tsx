import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import CatalogoSelect from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
// `pick` calls the component as a function, outside a render; outside a Field the hook hands
// nothing anyway. The wiring into a real Field is covered in __tests__/in-field.test.tsx.
vi.mock('@/shared/components/ui/Field/useFieldControl', () => ({ default: () => ({}) }))

type Box = ReactElement<{ onChange: (e: unknown) => void }>

const CATALOG = { valores: ['payroll', 'contractors_vendors'], label: (v?: string) => (v ?? '').toUpperCase() }
const PLACEHOLDER = 'Select'
const BUCKET = 'Budget bucket'
const ignore = () => undefined
const draw = (placeholder?: string) => renderToStaticMarkup(
  <CatalogoSelect catalogo={CATALOG} valor="" etiqueta={BUCKET} placeholder={placeholder} onChange={ignore} />,
)
const hasHandler = (node: ReactElement): node is Box => typeof node.props.onChange === 'function'

/** Picks `value` in the drawn box and answers what the caller was handed, if anything. */
function pick(value: string, placeholder?: string): string[] {
  const chosen: string[] = []
  const box = CatalogoSelect({ catalogo: CATALOG, valor: '', etiqueta: BUCKET, placeholder, onChange: (v) => chosen.push(v) })
  if (hasHandler(box)) box.props.onChange({ target: { value } })
  return chosen
}

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
    expect(pick(CATALOG.valores[1])).toEqual([CATALOG.valores[1]])
  })

  // The value is checked against the catalog, not cast into it: the blank choice goes through
  // only where it is drawn, and anything else the DOM could hand back is not passed on.
  it('passes on only a catalog member, or the blank choice where there is one', () => {
    expect(pick('', PLACEHOLDER)).toEqual([''])
    expect(pick('')).toEqual([])
    expect(pick('rent', PLACEHOLDER)).toEqual([])
  })
})
