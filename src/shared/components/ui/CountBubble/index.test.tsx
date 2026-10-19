import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CountBubble from '.'
import { MAX_DISPLAY, OVERFLOW_SUFFIX } from './constants'

const SOME = 3
const NONE = 0
const NEGATIVE = -2
const OVER_CAP = MAX_DISPLAY + 1
const HINT = '3 unread items'

describe('CountBubble', () => {
  it('draws the count when there is something to count', () => {
    const html = renderToStaticMarkup(<CountBubble count={SOME} />)
    expect(html).toContain(`>${SOME}<`)
  })

  it('draws nothing at zero', () => {
    expect(renderToStaticMarkup(<CountBubble count={NONE} />)).toBe('')
  })

  it('draws nothing for a negative count', () => {
    expect(renderToStaticMarkup(<CountBubble count={NEGATIVE} />)).toBe('')
  })

  it('shows the cap itself as a plain number', () => {
    const html = renderToStaticMarkup(<CountBubble count={MAX_DISPLAY} />)
    expect(html).toContain(`>${MAX_DISPLAY}<`)
  })

  it('caps anything above the cap at "N+"', () => {
    const html = renderToStaticMarkup(<CountBubble count={OVER_CAP} />)
    expect(html).toContain(`>${MAX_DISPLAY}${OVERFLOW_SUFFIX}<`)
    expect(html).not.toContain(`>${OVER_CAP}<`)
  })

  it('explains the count on hover when given a title', () => {
    const html = renderToStaticMarkup(<CountBubble count={SOME} title={HINT} />)
    expect(html).toContain(`title="${HINT}"`)
  })

  it('carries no tooltip when no title is given', () => {
    expect(renderToStaticMarkup(<CountBubble count={SOME} />)).not.toContain('title=')
  })
})
