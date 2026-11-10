import { expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import replaceBounds from './index'

const RANGE: EditableRange = {
  clientId: 'first',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const OTHER: EditableRange = {
  ...RANGE,
  clientId: 'second',
  startsAt: '12:00',
  endsAt: '13:00',
}

it('replaces only the chosen range when its new bounds are valid', () => {
  const bounds = { start: 570, end: 630 }
  const result = replaceBounds([RANGE, OTHER], RANGE, bounds)

  expect(result).toEqual([{ ...RANGE, startsAt: '09:30', endsAt: '10:30' }, OTHER])
})

it('rejects a resize that overlaps another range', () => {
  const bounds = { start: 570, end: 750 }

  expect(replaceBounds([RANGE, OTHER], RANGE, bounds)).toBeNull()
})
