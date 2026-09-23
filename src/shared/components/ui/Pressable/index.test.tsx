import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Pressable from './index'

type Control = ReactElement<{ onClick: () => void }>
const ignore = () => undefined

// A fixture, not shipped copy: callers hand Pressable a label their own locale already produced.
const A_DAY_NAME = 'Sunday, August 30'

describe('Pressable', () => {
  // The content can be a glyph, a number or a whole card, so the name cannot come from it: a
  // surface that draws "30" has to announce which 30th it is.
  it('announces the name the caller gave it, not what it draws', () => {
    const html = renderToStaticMarkup(<Pressable accessibleLabel={A_DAY_NAME} onClick={ignore}>30</Pressable>)
    expect(html).toContain(`aria-label="${A_DAY_NAME}"`)
    expect(html).toContain('type="button"')
  })

  it('wears the skin of the view it lives in, on top of its own', () => {
    const html = renderToStaticMarkup(<Pressable accessibleLabel="A day" className="cell" onClick={ignore}>30</Pressable>)
    expect(html).toContain('cell')
  })

  it('hands the press back untouched', () => {
    let presses = 0
    const count = () => { presses += 1 }
    const control = Pressable({ accessibleLabel: 'A day', onClick: count, children: '30' }) as Control
    control.props.onClick()
    expect(presses).toBe(1)
  })
})
