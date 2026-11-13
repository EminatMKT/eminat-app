import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LocaleProvider, translate } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import GridDay from './index'
import type { GridDayProps } from '../types'

const NOOP = () => undefined
const DEFAULT_LOCALE = 'es'
const MONDAY = AVAILABILITY_DAYS[0]
const props: GridDayProps = {
  day: MONDAY,
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
const FOCUSABLE_TAB_INDEX_MARKER = 'tabindex="0"'

function renderGridDay(dayProps: GridDayProps) {
  return renderToStaticMarkup(<LocaleProvider><GridDay {...dayProps} /></LocaleProvider>)
}

it('renders one day header and a create track with a read-only alternative', () => {
  const html = renderGridDay(props)
  const viewing = renderGridDay({ ...props, readOnly: true })

  expect(html).toContain(DAY_MARKER)
  expect(html).toContain(TRACK_MARKER)
  expect(viewing).toContain(DAY_MARKER)
})

it('makes the track focusable with its add-range hint when editable', () => {
  const html = renderGridDay(props)
  const dayLabel = translate(DEFAULT_LOCALE, MONDAY.labelKey)
  const expectedHint = translate(DEFAULT_LOCALE, EDITOR_COPY.addRangeHint, { day: dayLabel })

  expect(html).toContain(FOCUSABLE_TAB_INDEX_MARKER)
  expect(html).toContain(expectedHint)
})

it('leaves the track unfocusable with no add-range hint when read-only', () => {
  const html = renderGridDay({ ...props, readOnly: true })

  expect(html).not.toContain(FOCUSABLE_TAB_INDEX_MARKER)
})
