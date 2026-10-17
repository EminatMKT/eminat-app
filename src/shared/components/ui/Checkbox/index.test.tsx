import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Checkbox from '.'

// No click-simulation test: this suite renders statically, so handlers are never attached here.
const LABEL = 'label-under-test'
const HINT = 'hint-under-test'
const describedBy = (html: string) => html.match(/aria-describedby="([^"]+)"/)?.[1]

describe('Checkbox', () => {
  it('renders checked when it is checked', () => {
    const html = renderToStaticMarkup(<Checkbox checked onChange={vi.fn()}>{LABEL}</Checkbox>)
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked=""')
    expect(html).toContain(LABEL)
  })

  it('renders unchecked when it is not checked', () => {
    const html = renderToStaticMarkup(<Checkbox checked={false} onChange={vi.fn()}>{LABEL}</Checkbox>)
    expect(html).not.toContain('checked=""')
  })

  it('points a disabled control at its rendered hint', () => {
    const html = renderToStaticMarkup(
      <Checkbox checked disabled hint={HINT} onChange={vi.fn()}>{LABEL}</Checkbox>,
    )
    const id = describedBy(html)
    expect(html).toContain('disabled=""')
    expect(id).toBeDefined()
    expect(html).toContain(`id="${id}"`)
    expect(html).toContain(HINT)
  })

  it('draws no description and no hint span when it is enabled', () => {
    const html = renderToStaticMarkup(<Checkbox checked onChange={vi.fn()}>{LABEL}</Checkbox>)
    expect(describedBy(html)).toBeUndefined()
    expect(html).not.toContain('<span')
  })
})
