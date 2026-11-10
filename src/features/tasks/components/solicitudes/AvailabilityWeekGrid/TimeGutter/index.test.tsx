import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { DAY_START_TIME } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { GUTTER_MARKER } from './constants'
import TimeGutter from './index'

const LAST_HOUR_LABEL = '23:00'
const EXPECTED_FRAGMENTS = [GUTTER_MARKER, DAY_START_TIME, LAST_HOUR_LABEL]

it('renders the shared time-of-day gutter with an hour label for midnight and for 23:00', () => {
  const html = renderToStaticMarkup(<TimeGutter />)

  for (const fragment of EXPECTED_FRAGMENTS) {
    expect(html).toContain(fragment)
  }
})
