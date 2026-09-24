import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelHeading from './index'

const NAME = 'Recordatorios'

describe('PanelHeading', () => {
  // The screen's name is the h2; a panel inside it is one level below, so the outline nests.
  it('names a panel with the heading level under the screen name', () => {
    const html = renderToStaticMarkup(<PanelHeading>{NAME}</PanelHeading>)
    expect(html).toContain('<h3')
    expect(html).toContain(NAME)
  })
})
