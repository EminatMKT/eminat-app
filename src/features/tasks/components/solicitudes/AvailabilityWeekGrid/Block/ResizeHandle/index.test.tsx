import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ResizeHandle from '.'

describe('ResizeHandle', () => {
  it('is hidden from assistive tech, since the popover carries the real edit path', () => {
    const html = renderToStaticMarkup(<ResizeHandle edge="top" />)

    expect(html).toContain('aria-hidden="true"')
  })

  it('renders both the top and bottom edge without crashing', () => {
    expect(() => renderToStaticMarkup(<ResizeHandle edge="top" />)).not.toThrow()
    expect(() => renderToStaticMarkup(<ResizeHandle edge="bottom" />)).not.toThrow()
  })
})
