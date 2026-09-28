import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RecordButton from './index'

// Fixtures, not shipped copy: callers hand the surface text their own locale already produced.
const SAID = 'Payroll, due Sep 30, 2026'
const CONCEPT = 'Payroll'
const ignore = () => undefined
const draw = (look: 'card' | 'note') =>
  renderToStaticMarkup(<RecordButton accessibleLabel={SAID} look={look} onPress={ignore}>{CONCEPT}</RecordButton>)

describe('RecordButton', () => {
  // The whole record is one target: whatever the caller lays out inside, it opens on a press.
  it('wraps what it is handed in one control named after the whole record', () => {
    const html = draw('card')
    expect(html).toContain(`aria-label="${SAID}"`)
    expect(html).toContain(`>${CONCEPT}<`)
  })

  it('wears a different skin for a month note than for a reminder card', () => {
    expect(draw('card')).not.toBe(draw('note'))
  })

  it('answers a press', () => {
    let pressed = 0
    RecordButton({ accessibleLabel: SAID, look: 'card', onPress: () => { pressed += 1 }, children: CONCEPT }).props.onClick()
    expect(pressed).toBe(1)
  })
})
