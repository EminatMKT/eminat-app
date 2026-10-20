import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Field from '@/shared/components/ui/Field'
import PillToggle from './index'

// Fixtures, not shipped copy.
const NAME = 'Closing approval marker'
const STATE = 'Marked'
const ignore = () => undefined

describe('PillToggle', () => {
  it('says whether it is on', () => {
    expect(renderToStaticMarkup(<PillToggle label={STATE} active onClick={ignore} />)).toContain('aria-pressed="true"')
  })

  // Inside a Field the switch is named by the Field's visible label, not only by its On/Off word.
  it('is named by the Field it sits in', () => {
    const html = renderToStaticMarkup(<Field label={NAME}><PillToggle label={STATE} active={false} onClick={ignore} /></Field>)
    const target = html.match(/for="([^"]+)"/)?.[1]
    expect(target).toBeTruthy()
    expect(html).toMatch(new RegExp(`<button[^>]*id="${target}"`))
  })

  // Alone, as a filter pill, it stays exactly as it was: no id nobody points at.
  it('carries no id outside a Field', () => {
    expect(renderToStaticMarkup(<PillToggle label={STATE} active={false} onClick={ignore} />)).not.toContain('id=')
  })

  // Without `onClick` there's nothing to choose: a value display, not a control.
  it('shows a value, not a control, when nothing can choose it', () => {
    const html = renderToStaticMarkup(<PillToggle label={STATE} active={false} />)
    expect(html).toContain(STATE)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-pressed')
  })

  // `diff` is cosmetic only — it must not turn a value display into a control.
  it('highlights the value as different without becoming a control', () => {
    const html = renderToStaticMarkup(<PillToggle label={STATE} active={false} diff />)
    expect(html).toContain(STATE)
    expect(html).not.toContain('<button')
  })
})
