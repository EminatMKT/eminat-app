import { it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ActionStrip from './index'

// A fixture, not shipped copy.
const TEXT = 'fixture action'

// One box holds the line and then the buttons, so a narrow footer can wrap the line above them.
it('holds what it is given inside one box', () => {
  const html = renderToStaticMarkup(<ActionStrip>{TEXT}</ActionStrip>)
  expect(html.startsWith('<div')).toBe(true)
  expect(html).toContain(TEXT)
})
