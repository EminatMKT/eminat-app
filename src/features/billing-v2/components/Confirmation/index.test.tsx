import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Confirmation from './index'

// A fixture, not shipped copy.
const SAID = 'fixture confirmation'

describe('Confirmation', () => {
  // The live region is on the page before anything is said, so a reader announces what arrives.
  it('keeps a polite live region in place, empty until there is something to say', () => {
    const quiet = renderToStaticMarkup(<Confirmation text={null} />)
    expect(quiet).toContain('role="status"')
    expect(quiet).not.toContain(SAID)
    expect(renderToStaticMarkup(<Confirmation text={SAID} />)).toContain(SAID)
  })
})
