import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { SegmentResizeInput } from '../types'
import configuration from '.'

const RANGE: EditableRange = {
  clientId: 'selected',
  weekday: 1,
  startsAt: '23:00',
  endsAt: '24:00',
  note: null,
}
const input: SegmentResizeInput = {
  range: RANGE,
  ranges: [RANGE],
  dayRanges: [RANGE],
  columnTop: () => 12,
  readOnly: false,
  onChange: vi.fn(),
}
const BOUNDS = { start: 1380, end: 1440 }

it('derives canonical midnight bounds and excludes the selected range', () => {
  const config = configuration(() => input)

  expect(config.currentBounds).toEqual(BOUNDS)
  expect(config.otherDayRanges).toEqual([])
  expect(config.column.columnTop).toBe(12)
  expect(AVAILABILITY_DAYS[0].weekday).toBe(RANGE.weekday)
})
