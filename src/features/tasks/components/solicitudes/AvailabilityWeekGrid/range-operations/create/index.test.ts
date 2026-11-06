import { expect, it } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import createRange from './index'

const EXISTING: EditableRange = {
  clientId: 'existing',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}

it('creates a valid range and retains the rest of the week', () => {
  const input = { day: AVAILABILITY_DAYS[0], bounds: { start: 600, end: 660 }, ranges: [EXISTING] }
  const result = createRange(input)

  expect(result).toHaveLength(2)
  expect(result?.[1]).toMatchObject({ weekday: 1, startsAt: '10:00', endsAt: '11:00' })
  expect(result?.[1].clientId).not.toBe(EXISTING.clientId)
})

it('does not create an overlapping block', () => {
  const input = { day: AVAILABILITY_DAYS[0], bounds: { start: 570, end: 630 }, ranges: [EXISTING] }

  expect(createRange(input)).toBeNull()
})
