import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Panel from './index'

const EMPTY = 'nothing-here'
const ROW = <li data-row="1" />

describe('Combobox Panel', () => {
  it('lists the rows and marks a multiple list', () => {
    const html = renderToStaticMarkup(<Panel id="list" multiple hasRows empty={EMPTY}>{ROW}</Panel>)
    expect(html).toContain('role="listbox"')
    expect(html).toContain('aria-multiselectable="true"')
    expect(html).not.toContain(EMPTY)
  })

  it('says the empty message when there is no row', () => {
    const html = renderToStaticMarkup(<Panel id="list" multiple={false} hasRows={false} empty={EMPTY}>{null}</Panel>)
    expect(html).toContain(EMPTY)
    expect(html).not.toContain('aria-multiselectable')
  })
})
