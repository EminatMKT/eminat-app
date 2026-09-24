import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RecordButton from './index'

const SAID = 'Payroll · Sep 30, 2026'

describe('RecordButton', () => {
  // What is on the surface and what a screen reader hears are the same words.
  it('says the same line on screen and out loud', () => {
    const html = renderToStaticMarkup(<RecordButton said={SAID} look="item" onPress={() => undefined} />)
    expect(html).toContain(`aria-label="${SAID}"`)
    expect(html).toContain(`>${SAID}<`)
  })

  it('wears a different skin for a month note than for a list row', () => {
    const item = renderToStaticMarkup(<RecordButton said={SAID} look="item" onPress={() => undefined} />)
    const note = renderToStaticMarkup(<RecordButton said={SAID} look="note" onPress={() => undefined} />)
    expect(item).not.toBe(note)
  })

  it('answers a press', () => {
    let pressed = 0
    RecordButton({ said: SAID, look: 'item', onPress: () => { pressed += 1 } }).props.onClick()
    expect(pressed).toBe(1)
  })
})
