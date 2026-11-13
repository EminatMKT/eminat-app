import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HoursStatus from './index'

const belowSymbol = '↓'
const belowText = 'Faltan 2 horas'
const completeToneAttribute = 'data-tone="complete"'
const inlineStyleAttribute = 'style='
const hiddenFromAssistiveTech = 'aria-hidden="true"'

describe('HoursStatus', () => {
  it('draws the symbol and the text', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="↓" text="Faltan 2 horas" tone="below" />)

    expect(html).toContain(belowSymbol)
    expect(html).toContain(belowText)
  })

  it('carries the tone as a data attribute, not inline color', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="✓" text="Completo" tone="complete" />)

    expect(html).toContain(completeToneAttribute)
    expect(html).not.toContain(inlineStyleAttribute)
  })

  it('hides the symbol from assistive tech, since the text already states the status', () => {
    const html = renderToStaticMarkup(<HoursStatus symbol="↑" text="2 horas de más" tone="above" />)

    expect(html).toContain(hiddenFromAssistiveTech)
  })
})
