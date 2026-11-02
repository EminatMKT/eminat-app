import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import Counter from './index'

// Matches the module's class name so the near-limit assertion checks the real selector, not a
// content hash (same pattern as DayNumber/DayEntry's CSS module mocks).
vi.mock('./index.module.css', () => ({ default: { counter: 'counter' } }))

describe('Counter', () => {
  it('draws the text under the given id', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="20 characters remaining" />)

    expect(html).toContain('id="note-counter"')
    expect(html).toContain('20 characters remaining')
  })

  it('flags the near-limit state as a data attribute', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

    expect(html).toContain('data-near-limit="true"')
  })

  it('carries the counter class that the near-limit CSS rule styles', () => {
    const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

    expect(html).toContain('class="counter"')
    expect(html).toContain('data-near-limit="true"')
  })
})
