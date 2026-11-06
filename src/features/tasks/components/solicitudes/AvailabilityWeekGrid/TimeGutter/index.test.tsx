import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import TimeGutter from './index'

const GUTTER_MARKER = 'data-grid-gutter'
const MIDNIGHT_LABEL = '00:00'
const LAST_HOUR_LABEL = '23:00'

it('renders the shared time-of-day gutter with an hour label for midnight and for 23:00', () => {
  const html = renderToStaticMarkup(<TimeGutter />)

  expect(html).toContain(GUTTER_MARKER)
  expect(html).toContain(MIDNIGHT_LABEL)
  expect(html).toContain(LAST_HOUR_LABEL)
})
