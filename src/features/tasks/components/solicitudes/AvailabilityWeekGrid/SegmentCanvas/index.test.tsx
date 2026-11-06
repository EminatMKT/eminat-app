import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LocaleProvider } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import SegmentCanvas from './index'
import type { SegmentCanvasProps } from '../types'

const RANGE: EditableRange = {
  clientId: 'range-id',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const props: SegmentCanvasProps = {
  range: RANGE,
  dayRanges: [RANGE],
  day: AVAILABILITY_DAYS[0],
  ranges: [RANGE],
  workday: null,
  readOnly: false,
  onChange: NOOP,
  onOpen: NOOP,
  onCreate: NOOP,
  onAdd: NOOP,
  columnTop: () => 0,
}

it('renders a range and leaves resize handles out of read-only mode', () => {
  const editable = renderToStaticMarkup(
    <LocaleProvider><SegmentCanvas {...props} /></LocaleProvider>,
  )
  const viewProps = { ...props, readOnly: true }
  const viewing = renderToStaticMarkup(
    <LocaleProvider><SegmentCanvas {...viewProps} /></LocaleProvider>,
  )
  const time = '09:00–10:00'
  const handle = 'aria-hidden="true"'

  expect(editable).toContain(time)
  expect(editable).toContain(handle)
  expect(viewing).toContain(time)
  expect(viewing).not.toContain(handle)
})
