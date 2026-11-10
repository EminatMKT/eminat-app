import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import Counter from './index'

// vi.hoisted so the values exist before Vitest hoists the vi.mock call below it.
const { COUNTER_CSS_MODULE, COUNTER_CLASS } = vi.hoisted(() => ({
  COUNTER_CSS_MODULE: './index.module.css',
  COUNTER_CLASS: 'counter',
}))

// Matches the module's class name so the near-limit assertion checks the real selector, not a
// content hash (same pattern as DayNumber/DayEntry's CSS module mocks).
vi.mock(COUNTER_CSS_MODULE, () => ({ default: { counter: COUNTER_CLASS } }))

describe('Counter', () => {
  it('draws the text under the given id', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="20 characters remaining" />)

    expect(html).toMatch(/id="note-counter"/)
    expect(html).toMatch(/20 characters remaining/)
  })

  it('flags the near-limit state as a data attribute', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

    expect(html).toMatch(/data-near-limit="true"/)
  })

  it('carries the counter class that the near-limit CSS rule styles', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

    expect(html).toContain(`class="${COUNTER_CLASS}"`)
    expect(html).toMatch(/data-near-limit="true"/)
  })
})
