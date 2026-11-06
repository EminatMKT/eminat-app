import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LocaleProvider } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import GridDay from './index'
import type { GridDayProps } from '../types'

const NOOP = () => undefined
const props: GridDayProps = {
  day: AVAILABILITY_DAYS[0],
  ranges: [],
  workday: null,
  readOnly: false,
  onChange: NOOP,
  onOpen: NOOP,
  onCreate: NOOP,
  onAdd: NOOP,
}
const DAY_MARKER = 'data-grid-day'
const TRACK_MARKER = 'data-grid-track'

it('renders one day header and a create track with a read-only alternative', () => {
  const html = renderToStaticMarkup(
    <LocaleProvider><GridDay {...props} /></LocaleProvider>,
  )
  const viewProps = { ...props, readOnly: true }
  const viewing = renderToStaticMarkup(
    <LocaleProvider><GridDay {...viewProps} /></LocaleProvider>,
  )

  expect(html).toContain(DAY_MARKER)
  expect(html).toContain(TRACK_MARKER)
  expect(viewing).toContain(DAY_MARKER)
})
