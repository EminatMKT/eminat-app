import { expect, it } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import buildRange from '.'

it('builds distinct draft identities and preserves midnight bounds', () => {
  const bounds = { start: 1410, end: 1440 }
  const input = { day: AVAILABILITY_DAYS[0], bounds }
  const expected = {
    weekday: 1,
    startsAt: '23:30',
    endsAt: '24:00',
    note: '',
  }
  const first = buildRange(input)
  const second = buildRange(input)

  expect(first).toMatchObject(expected)
  expect(first.clientId).not.toBe(second.clientId)
  expect(first.clientId).toMatch(/^draft-/)
})
