import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useDialog from './index'

const ignore = () => undefined

// The smallest caller: a box that wears what the hook hands it. On the server there is no
// document and no focus, so rendering it here also proves the hook reaches for neither.
const probe: { open?: boolean } = {}
function Probe() {
  const { titleId, box } = useDialog(ignore, probe.open)
  return <div {...box} aria-labelledby={titleId} />
}
const draw = (open?: boolean) => { probe.open = open; return renderToStaticMarkup(<Probe />) }
const html = draw()

describe('useDialog', () => {
  it('marks the box modal and able to hold the focus itself', () => {
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('tabindex="-1"')
  })

  // A box that is a dialog only while open —a drawer— is a plain box while closed.
  it('leaves a closed box a plain one: not modal, and not holding the focus', () => {
    const closed = draw(false)
    expect(closed).not.toContain('aria-modal')
    expect(closed).not.toContain('tabindex')
    expect(draw(true)).toContain('aria-modal="true"')
  })

  it('hands out an id for the title that names the box', () => {
    expect(html).toMatch(/aria-labelledby="[^"]+"/)
  })
})
