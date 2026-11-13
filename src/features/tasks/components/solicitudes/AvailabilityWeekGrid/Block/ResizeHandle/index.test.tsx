import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ResizeHandle from '.'

const HIDDEN_ATTRIBUTE = 'aria-hidden="true"'

describe('ResizeHandle', () => {
  it('is hidden from assistive tech, since the popover carries the real edit path', () => {
    const html = renderToStaticMarkup(<ResizeHandle edge="top" />)

    expect(html).toContain(HIDDEN_ATTRIBUTE)
  })

  it('renders both the top and bottom edge without crashing', () => {
    expect(() => renderToStaticMarkup(<ResizeHandle edge="top" />)).not.toThrow()
    expect(() => renderToStaticMarkup(<ResizeHandle edge="bottom" />)).not.toThrow()
  })
})
