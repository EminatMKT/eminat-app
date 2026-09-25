import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useDialog from './index'

const ignore = () => undefined

// The smallest caller: a box that wears what the hook hands it. On the server there is no
// document and no focus, so rendering it here also proves the hook reaches for neither.
function Probe() {
  const { titleId, box } = useDialog(ignore)
  return <div {...box} aria-labelledby={titleId} />
}
const html = renderToStaticMarkup(<Probe />)

describe('useDialog', () => {
  it('marks the box modal and able to hold the focus itself', () => {
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('tabindex="-1"')
  })

  it('hands out an id for the title that names the box', () => {
    expect(html).toMatch(/aria-labelledby="[^"]+"/)
  })
})
