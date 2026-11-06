import { expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import commitRange from './index'

const RANGE: EditableRange = {
  clientId: 'first',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const OVERLAP: EditableRange = {
  clientId: 'second',
  weekday: 1,
  startsAt: '09:30',
  endsAt: '10:30',
  note: null,
}
const LATE: EditableRange = {
  clientId: 'late',
  weekday: 1,
  startsAt: '23:00',
  endsAt: '24:00',
  note: null,
}
const ORIGINAL = [RANGE]
const INVALID_END_TIME = '24:01'
const INVALID_RANGE_CASE = 'rejects invalid end boundaries and same-day overlaps'
const MIDNIGHT_END_CASE = 'accepts a non-overlapping range ending at midnight'

it(INVALID_RANGE_CASE, () => {
  const overlapping = [RANGE, OVERLAP]
  const invalidLate = { ...LATE, endsAt: INVALID_END_TIME }
  const invalidEnd = [RANGE, invalidLate]

  expect(commitRange(overlapping)).toBeNull()
  expect(commitRange(invalidEnd)).toBeNull()
})

it(MIDNIGHT_END_CASE, () => {
  const midnightEnd = [RANGE, LATE]

  expect(commitRange(midnightEnd)).toBe(midnightEnd)
})

it('accepts adjacent ranges and preserves the input array', () => {
  const adjacent = { ...OVERLAP, startsAt: RANGE.endsAt }
  const next = [RANGE, adjacent]

  expect(commitRange(next)).toBe(next)
  expect(ORIGINAL).toEqual([RANGE])
})
