import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HoursStatus from './index'

describe('HoursStatus', () => {
  it('draws the symbol and the text', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="↓" text="Faltan 2 horas" tone="below" />)

    expect(html).toContain('↓')
    expect(html).toContain('Faltan 2 horas')
  })

  it('carries the tone as a data attribute, not inline color', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="✓" text="Completo" tone="complete" />)

    expect(html).toContain('data-tone="complete"')
    expect(html).not.toContain('style=')
  })

  it('hides the symbol from assistive tech, since the text already states the status', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="↑" text="2 horas de más" tone="above" />)

    expect(html).toContain('aria-hidden="true"')
  })
})
