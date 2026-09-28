import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CrashFrame from './index'

const CONTENT = 'inside'
const HEADING_TAG = '<h1'
const BOX_TAG = '<div'
const ALERT = 'role="alert"'

const draw = (part: 'screen' | 'heading' | 'text') => renderToStaticMarkup(<CrashFrame part={part}>{CONTENT}</CrashFrame>)

describe('CrashFrame', () => {
  // The screen's name is a real heading: a screen reader lands on it first.
  it('draws the heading part as the page heading', () => {
    const html = draw('heading')
    expect(html.startsWith(HEADING_TAG)).toBe(true)
    expect(html).toContain(CONTENT)
  })

  it('draws every other part as a plain box around its content', () => {
    expect(draw('screen').startsWith(BOX_TAG)).toBe(true)
    expect(draw('text').startsWith(BOX_TAG)).toBe(true)
    expect(draw('text')).toContain(CONTENT)
  })

  // The whole screen is announced when it replaces the page, not only when someone tabs into it.
  it('announces the screen as an alert, and only the screen', () => {
    expect(draw('screen')).toContain(ALERT)
    expect(draw('text')).not.toContain(ALERT)
  })
})
